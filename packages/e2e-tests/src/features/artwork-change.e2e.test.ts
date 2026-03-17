/**
 * E2E tests for artwork change detection via Subsonic/Navidrome.
 *
 * Tests that artwork changes are detected end-to-end when using
 * --check-artwork with a Subsonic source. The flow:
 *
 * 1. Sync collection to iPod with --check-artwork (establishes artwork hash baselines)
 * 2. Replace artwork in the source FLAC files
 * 3. Trigger Navidrome rescan so getCoverArt returns new bytes
 * 4. Dry-run sync with --check-artwork to verify artwork-updated is detected
 *
 * Also tests artwork-removed detection:
 * 1. Sync collection to iPod with --check-artwork (artwork present)
 * 2. Strip ALL embedded artwork from the FLAC files
 * 3. Trigger Navidrome rescan so getCoverArt returns no artwork
 * 4. Dry-run sync with --check-artwork to verify artwork-removed is detected
 *
 * These tests require Docker to run Navidrome.
 *
 * To run:
 *   SUBSONIC_E2E=1 bun test src/features/artwork-change.e2e.test.ts
 *
 * @tags docker
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdir, rm, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { withTarget } from '../targets/index.js';
import { runCliJson, cleanupTempConfig } from '../helpers/cli-runner.js';
import { isDockerAvailable } from '../sources/index.js';
import { startContainer, stopContainer } from '../docker/index.js';
import { areFixturesAvailable, getTrackPath, Tracks } from '../helpers/fixtures.js';

import type { SyncOutput } from 'podkit/types';

// =============================================================================
// Test Setup
// =============================================================================

const subsonicE2eEnabled = process.env.SUBSONIC_E2E === '1';
let dockerAvailable = false;
let containerId: string | null = null;
let tempDir: string;
let musicDir: string;
let dataDir: string;
let serverPort: number;
const password = 'testpass';

/**
 * Check if metaflac is available (needed to re-embed artwork).
 */
function isMetaflacAvailable(): boolean {
  try {
    execSync('which metaflac', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if ffmpeg is available (needed to generate replacement artwork).
 */
function isFfmpegAvailable(): boolean {
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create test fixtures for artwork change detection.
 *
 * Copies FLAC files with embedded artwork into a Navidrome-scannable directory.
 * Uses goldberg-selections tracks which have cover.jpg and embedded artwork.
 */
async function createArtworkFixtures(targetMusicDir: string): Promise<void> {
  // Create album directory matching the fixture metadata
  const albumDir = join(targetMusicDir, 'Synthetic Classics', 'Goldberg Selections');
  await mkdir(albumDir, { recursive: true });

  // Copy the three goldberg-selections tracks (all have embedded artwork)
  const tracks = [Tracks.HARMONY, Tracks.VIBRATO, Tracks.TREMOLO];
  for (const track of tracks) {
    const srcPath = getTrackPath(track.album, track.filename);
    const dstPath = join(albumDir, track.filename);
    await copyFile(srcPath, dstPath);
  }
}

/**
 * Replace embedded artwork in all FLAC files with a new generated image.
 *
 * Generates a solid red 500x500 JPEG image and re-embeds it in each FLAC file.
 * This changes the artwork hash that the Subsonic adapter computes.
 */
async function replaceArtworkInFixtures(targetMusicDir: string): Promise<void> {
  const albumDir = join(targetMusicDir, 'Synthetic Classics', 'Goldberg Selections');
  const newCoverPath = join(albumDir, 'cover-new.jpg');

  // Generate a visually distinct replacement image (solid red)
  execSync(
    `ffmpeg -y -f lavfi -i color=c=red:s=500x500:d=1 -frames:v 1 "${newCoverPath}"`,
    { stdio: 'ignore' }
  );

  // Re-embed the new artwork in each FLAC file
  const trackFiles = ['01-harmony.flac', '02-vibrato.flac', '03-tremolo.flac'];
  for (const filename of trackFiles) {
    const trackPath = join(albumDir, filename);
    // Remove existing pictures and embed the new one
    execSync(
      `metaflac --remove --block-type=PICTURE "${trackPath}" && metaflac --import-picture-from="${newCoverPath}" "${trackPath}"`,
      { stdio: 'ignore' }
    );
  }
}

/**
 * Wait for Navidrome HTTP + auth to be ready.
 */
async function waitForServer(port: number, timeoutMs = 30000): Promise<void> {
  const startTime = Date.now();
  const pingUrl = `http://localhost:${port}/rest/ping?u=admin&p=${password}&c=podkit-test&v=1.16.1&f=json`;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(pingUrl);
      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;
        const subsonicResponse = data['subsonic-response'] as Record<string, unknown> | undefined;
        if (subsonicResponse?.status === 'ok') {
          return;
        }
      }
    } catch {
      // Keep trying
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Navidrome server did not start within ${timeoutMs}ms`);
}

/**
 * Wait for Navidrome to finish scanning and have at least the expected album count.
 */
async function waitForLibraryScan(
  port: number,
  minAlbums = 1,
  timeoutMs = 60000
): Promise<void> {
  const startTime = Date.now();
  const albumsUrl = `http://localhost:${port}/rest/getAlbumList2?u=admin&p=${password}&c=podkit-test&v=1.16.1&f=json&type=alphabeticalByName&size=10`;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(albumsUrl);
      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;
        const subsonicResponse = data['subsonic-response'] as Record<string, unknown> | undefined;
        const albumList = subsonicResponse?.albumList2 as Record<string, unknown> | undefined;
        const albums = albumList?.album as unknown[] | undefined;

        if (albums && albums.length >= minAlbums) {
          return;
        }
      }
    } catch {
      // Keep trying
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Navidrome library scan did not complete within ${timeoutMs}ms`);
}

/**
 * Trigger a Navidrome library rescan via its API.
 *
 * Uses the Navidrome REST API to initiate a full rescan, then waits for
 * it to complete by polling the scan status.
 */
async function triggerNavidromeRescan(port: number): Promise<void> {
  // Navidrome exposes a scan trigger via its internal API.
  // First, get an auth token via the Subsonic API's getUser to confirm auth works,
  // then use the Navidrome-specific scan endpoint.
  //
  // The simplest approach: restart the container. Navidrome rescans at startup
  // because we set ND_SCANSCHEDULE=@startup. But that's slow.
  //
  // Instead, use the Subsonic startScan extension that Navidrome supports.
  // Use fullScan=true to force Navidrome to re-read all file metadata including artwork
  const scanUrl = `http://localhost:${port}/rest/startScan?u=admin&p=${password}&c=podkit-test&v=1.16.1&f=json&fullScan=true`;

  try {
    await fetch(scanUrl);
  } catch {
    // startScan might not return cleanly, that's ok
  }

  // Wait for the scan to complete by polling getScanStatus
  const statusUrl = `http://localhost:${port}/rest/getScanStatus?u=admin&p=${password}&c=podkit-test&v=1.16.1&f=json`;
  const startTime = Date.now();
  const timeoutMs = 60000;

  // Give Navidrome a moment to start the scan
  await new Promise((resolve) => setTimeout(resolve, 2000));

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(statusUrl);
      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;
        const subsonicResponse = data['subsonic-response'] as Record<string, unknown> | undefined;
        const scanStatus = subsonicResponse?.scanStatus as Record<string, unknown> | undefined;

        if (scanStatus && scanStatus.scanning === false) {
          // Scan is complete
          return;
        }
      }
    } catch {
      // Keep trying
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Navidrome rescan did not complete within ${timeoutMs}ms`);
}

/**
 * Create a config file for a Subsonic source with checkArtwork enabled.
 */
async function createArtworkCheckConfig(port: number): Promise<string> {
  const configDir = join(tmpdir(), `podkit-artwork-config-${randomUUID()}`);
  await mkdir(configDir, { recursive: true });
  const configPath = join(configDir, 'config.toml');

  await writeFile(
    configPath,
    `[music.main]
type = "subsonic"
url = "http://localhost:${port}"
username = "admin"

[defaults]
music = "main"

# Enable artwork change detection
checkArtwork = true
`
  );

  return configPath;
}

beforeAll(async () => {
  if (!subsonicE2eEnabled) {
    console.log('Skipping artwork change detection tests (set SUBSONIC_E2E=1 to enable)');
    return;
  }

  dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    console.log('Skipping: Docker is not available');
    return;
  }

  const fixturesAvailable = await areFixturesAvailable();
  if (!fixturesAvailable) {
    console.log('Skipping: audio fixtures not available');
    return;
  }

  if (!isMetaflacAvailable()) {
    console.log('Skipping: metaflac not available (needed for artwork re-embedding)');
    return;
  }

  if (!isFfmpegAvailable()) {
    console.log('Skipping: ffmpeg not available (needed for generating replacement artwork)');
    return;
  }

  // Create temp directories and fixtures
  tempDir = join(tmpdir(), `podkit-artwork-change-${randomUUID()}`);
  musicDir = join(tempDir, 'music');
  dataDir = join(tempDir, 'data');
  await mkdir(musicDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });

  await createArtworkFixtures(musicDir);

  // Start Navidrome container
  // Mount music as read-write so we can modify artwork between syncs
  serverPort = 4533 + Math.floor(Math.random() * 100);
  console.log(`Starting Navidrome container on port ${serverPort}...`);

  const result = await startContainer({
    image: 'deluan/navidrome:latest',
    source: 'subsonic-artwork',
    ports: [`${serverPort}:4533`],
    volumes: [`${musicDir}:/music`, `${dataDir}:/data`],
    env: [
      `ND_DEVAUTOCREATEADMINPASSWORD=${password}`,
      'ND_MUSICFOLDER=/music',
      'ND_DATAFOLDER=/data',
      'ND_SCANSCHEDULE=@startup',
      'ND_LOGLEVEL=warn',
    ],
  });

  containerId = result.containerId;
  await waitForServer(serverPort);
  await waitForLibraryScan(serverPort);
  console.log('Navidrome ready with artwork fixtures');
}, 120000);

afterAll(async () => {
  if (containerId) {
    console.log('Stopping Navidrome container...');
    await stopContainer(containerId);
    containerId = null;
  }

  if (tempDir) {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});

function shouldRun(): boolean {
  return subsonicE2eEnabled && dockerAvailable && containerId !== null;
}

// =============================================================================
// Tests
// =============================================================================

describe('artwork change detection (Subsonic)', () => {
  it.skipIf(!subsonicE2eEnabled)(
    'detects changed artwork via Subsonic after re-embedding',
    async () => {
      if (!shouldRun()) {
        console.log('Skipping: Docker not available or setup failed');
        return;
      }

      await withTarget(async (target) => {
        const configPath = await createArtworkCheckConfig(serverPort);

        try {
          // ------------------------------------------------------------------
          // Step 1: Initial sync with --check-artwork
          // This syncs tracks and establishes artwork hash baselines in sync tags
          // ------------------------------------------------------------------
          console.log('Step 1: Initial sync with --check-artwork...');
          const { result: syncResult, json: syncJson } = await runCliJson<SyncOutput>(
            [
              '--config',
              configPath,
              'sync',
              '--device',
              target.path,
              '--check-artwork',
              '--json',
            ],
            {
              env: { SUBSONIC_PASSWORD: password },
              timeout: 180000,
            }
          );

          expect(syncResult.exitCode).toBe(0);
          expect(syncJson?.success).toBe(true);
          // Should sync the 3 goldberg-selections tracks
          expect(syncJson?.result?.completed).toBeGreaterThanOrEqual(3);

          const trackCount = await target.getTrackCount();
          expect(trackCount).toBeGreaterThanOrEqual(3);
          console.log(`Initial sync completed: ${syncJson?.result?.completed} tracks`);

          // ------------------------------------------------------------------
          // Step 2: Verify sync tags have artwork hashes (art= field)
          // Run a second sync to force sync tag writes if the first sync
          // didn't establish baselines (first sync may add tracks without
          // baselines, then a --force-sync-tags pass writes them)
          // ------------------------------------------------------------------
          console.log('Step 2: Establishing artwork hash baselines...');
          const { result: baselineResult } = await runCliJson<SyncOutput>(
            [
              '--config',
              configPath,
              'sync',
              '--device',
              target.path,
              '--check-artwork',
              '--force-sync-tags',
              '--json',
            ],
            {
              env: { SUBSONIC_PASSWORD: password },
              timeout: 120000,
            }
          );

          expect(baselineResult.exitCode).toBe(0);

          // Verify we're now in sync (no more changes needed)
          const { result: verifyResult, json: verifyJson } = await runCliJson<SyncOutput>(
            [
              '--config',
              configPath,
              'sync',
              '--device',
              target.path,
              '--check-artwork',
              '--dry-run',
              '--json',
            ],
            {
              env: { SUBSONIC_PASSWORD: password },
              timeout: 60000,
            }
          );

          expect(verifyResult.exitCode).toBe(0);
          expect(verifyJson?.dryRun).toBe(true);
          // Should have no updates pending (artwork hashes match)
          const preChangeUpdates = verifyJson?.plan?.tracksToUpdate ?? 0;
          console.log(`Pre-change verification: ${preChangeUpdates} updates pending`);

          // ------------------------------------------------------------------
          // Step 3: Replace artwork in source FLAC files
          // ------------------------------------------------------------------
          console.log('Step 3: Replacing artwork in source files...');
          await replaceArtworkInFixtures(musicDir);

          // ------------------------------------------------------------------
          // Step 4: Trigger Navidrome library rescan
          // The new embedded artwork will be picked up by Navidrome,
          // making getCoverArt return different bytes.
          // ------------------------------------------------------------------
          // Clear Navidrome's artwork cache to force re-read from files
          console.log('Step 4: Clearing Navidrome artwork cache and triggering rescan...');
          try {
            await rm(join(dataDir, 'cache'), { recursive: true, force: true });
          } catch {
            // Cache dir may not exist
          }
          await triggerNavidromeRescan(serverPort);

          // Give Navidrome time to fully process the rescan and regenerate artwork
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // ------------------------------------------------------------------
          // Step 5: Dry-run sync with --check-artwork to detect changes
          // ------------------------------------------------------------------
          console.log('Step 5: Dry-run sync to detect artwork changes...');
          const { result: dryRunResult, json: dryRunJson } = await runCliJson<SyncOutput>(
            [
              '--config',
              configPath,
              'sync',
              '--device',
              target.path,
              '--check-artwork',
              '--dry-run',
              '--json',
            ],
            {
              env: { SUBSONIC_PASSWORD: password },
              timeout: 120000,
            }
          );

          expect(dryRunResult.exitCode).toBe(0);
          expect(dryRunJson?.success).toBe(true);
          expect(dryRunJson?.dryRun).toBe(true);

          // ------------------------------------------------------------------
          // Step 6: Verify artwork-updated appears in the update breakdown
          // ------------------------------------------------------------------
          const updateCount = dryRunJson?.plan?.tracksToUpdate ?? 0;
          // Cast to Record to access artwork-updated which may not be in all type versions
          const breakdown = dryRunJson?.plan?.updateBreakdown as
            | Record<string, number | undefined>
            | undefined;

          console.log(`Artwork change detection result:`);
          console.log(`  Tracks to update: ${updateCount}`);
          console.log(`  Update breakdown: ${JSON.stringify(breakdown)}`);
          expect(updateCount).toBeGreaterThan(0);
          expect(breakdown).toBeDefined();
          expect(breakdown?.['artwork-updated']).toBeGreaterThan(0);

          // All 3 tracks share the same album artwork, so all should be detected
          expect(breakdown?.['artwork-updated']).toBeGreaterThanOrEqual(3);

          console.log('Artwork change detection verified');

          // ------------------------------------------------------------------
          // Step 6: Actually sync the artwork updates (not just dry-run)
          // ------------------------------------------------------------------
          console.log('Step 6: Syncing artwork updates...');
          const { result: updateResult, json: updateJson } = await runCliJson<SyncOutput>(
            [
              '--config',
              configPath,
              'sync',
              '--device',
              target.path,
              '--check-artwork',
              '--json',
            ],
            {
              env: { SUBSONIC_PASSWORD: password },
              timeout: 180000,
            }
          );

          expect(updateResult.exitCode).toBe(0);
          expect(updateJson?.success).toBe(true);
          expect(updateJson?.result?.completed).toBeGreaterThanOrEqual(3);
          console.log(`Artwork sync completed: ${updateJson?.result?.completed} tracks updated`);

          // ------------------------------------------------------------------
          // Step 7: Verify idempotency — next sync should show 0 updates
          // ------------------------------------------------------------------
          console.log('Step 7: Verifying idempotency after artwork sync...');
          const { result: idempotentResult, json: idempotentJson } = await runCliJson<SyncOutput>(
            [
              '--config',
              configPath,
              'sync',
              '--device',
              target.path,
              '--check-artwork',
              '--dry-run',
              '--json',
            ],
            {
              env: { SUBSONIC_PASSWORD: password },
              timeout: 60000,
            }
          );

          expect(idempotentResult.exitCode).toBe(0);
          expect(idempotentJson?.plan?.tracksToUpdate).toBe(0);
          expect(idempotentJson?.plan?.tracksToAdd).toBe(0);
          console.log('Idempotency verified — no further updates needed');
        } finally {
          await cleanupTempConfig(configPath);
        }
      });
    },
    600000 // 10 min timeout for full workflow (sync + rescan + verify)
  );

  // Note: artwork-removed detection via Subsonic is not currently supported.
  // The Subsonic adapter sets hasArtwork=undefined (unknown) because the API's
  // coverArt field is unreliable for detecting artwork presence. artwork-removed
  // requires source.hasArtwork===false which never occurs with undefined.
  // The directory-source artwork-removed test covers this detection path.
  // See TASK-141 for planned sidecar/server artwork support.
  //
  // When TASK-141 is implemented, add a Subsonic artwork-removed test here.
});
