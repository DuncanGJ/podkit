/**
 * E2E test for artwork-updated detection via Subsonic/Navidrome WITHOUT
 * a separate --force-sync-tags step.
 *
 * Mirrors the directory-source Test 4 flow exactly:
 * 1. Single initial sync with --check-artwork (establishes baselines progressively)
 * 2. Replace artwork in source FLACs
 * 3. Clear Navidrome cache + trigger rescan
 * 4. Dry-run with --check-artwork → detect artwork-updated
 * 5. Actually sync with --check-artwork
 * 6. Idempotency: dry-run with --check-artwork → 0 updates
 *
 * To run:
 *   SUBSONIC_E2E=1 bun test src/features/simple-subsonic-artwork.e2e.test.ts
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

function isMetaflacAvailable(): boolean {
  try {
    execSync('which metaflac', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isFfmpegAvailable(): boolean {
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function createArtworkFixtures(targetMusicDir: string): Promise<void> {
  const albumDir = join(targetMusicDir, 'Synthetic Classics', 'Goldberg Selections');
  await mkdir(albumDir, { recursive: true });

  const tracks = [Tracks.HARMONY, Tracks.VIBRATO, Tracks.TREMOLO];
  for (const track of tracks) {
    const srcPath = getTrackPath(track.album, track.filename);
    const dstPath = join(albumDir, track.filename);
    await copyFile(srcPath, dstPath);
  }
}

async function replaceArtworkInFixtures(targetMusicDir: string): Promise<void> {
  const albumDir = join(targetMusicDir, 'Synthetic Classics', 'Goldberg Selections');
  const newCoverPath = join(albumDir, 'cover-new.jpg');

  execSync(
    `ffmpeg -y -f lavfi -i color=c=red:s=500x500:d=1 -frames:v 1 "${newCoverPath}"`,
    { stdio: 'ignore' }
  );

  const trackFiles = ['01-harmony.flac', '02-vibrato.flac', '03-tremolo.flac'];
  for (const filename of trackFiles) {
    const trackPath = join(albumDir, filename);
    execSync(
      `metaflac --remove --block-type=PICTURE "${trackPath}" && metaflac --import-picture-from="${newCoverPath}" "${trackPath}"`,
      { stdio: 'ignore' }
    );
  }
}

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

async function triggerNavidromeRescan(port: number): Promise<void> {
  const scanUrl = `http://localhost:${port}/rest/startScan?u=admin&p=${password}&c=podkit-test&v=1.16.1&f=json&fullScan=true`;

  try {
    await fetch(scanUrl);
  } catch {
    // startScan might not return cleanly, that's ok
  }

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

async function createSubsonicConfig(port: number): Promise<string> {
  const configDir = join(tmpdir(), `podkit-simple-artwork-config-${randomUUID()}`);
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

checkArtwork = true
`
  );

  return configPath;
}

// =============================================================================
// Lifecycle
// =============================================================================

beforeAll(async () => {
  if (!subsonicE2eEnabled) {
    console.log('Skipping simple Subsonic artwork tests (set SUBSONIC_E2E=1 to enable)');
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
    console.log('Skipping: metaflac not available');
    return;
  }

  if (!isFfmpegAvailable()) {
    console.log('Skipping: ffmpeg not available');
    return;
  }

  // Create temp directories and fixtures
  tempDir = join(tmpdir(), `podkit-simple-artwork-${randomUUID()}`);
  musicDir = join(tempDir, 'music');
  dataDir = join(tempDir, 'data');
  await mkdir(musicDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });

  await createArtworkFixtures(musicDir);

  // Start Navidrome container
  serverPort = 4533 + Math.floor(Math.random() * 100);
  console.log(`Starting Navidrome container on port ${serverPort}...`);

  const result = await startContainer({
    image: 'deluan/navidrome:latest',
    source: 'subsonic-simple-artwork',
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
// Test
// =============================================================================

describe('simple artwork-updated detection (Subsonic, no --force-sync-tags)', () => {
  it.skipIf(!subsonicE2eEnabled)(
    'detects artwork-updated with single initial sync (mirrors directory Test 4)',
    async () => {
      if (!shouldRun()) {
        console.log('Skipping: Docker not available or setup failed');
        return;
      }

      await withTarget(async (target) => {
        const configPath = await createSubsonicConfig(serverPort);

        try {
          // ----------------------------------------------------------------
          // Step 1: Single initial sync with --check-artwork
          // NO --force-sync-tags — baselines should be written progressively
          // ----------------------------------------------------------------
          console.log('Step 1: Initial sync with --check-artwork (no --force-sync-tags)...');
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
          expect(syncJson?.result?.completed).toBeGreaterThanOrEqual(3);

          const trackCount = await target.getTrackCount();
          expect(trackCount).toBeGreaterThanOrEqual(3);
          console.log(`Initial sync completed: ${syncJson?.result?.completed} tracks`);

          // ----------------------------------------------------------------
          // Step 2: Replace artwork in source FLACs
          // ----------------------------------------------------------------
          console.log('Step 2: Replacing artwork in source files...');
          await replaceArtworkInFixtures(musicDir);

          // ----------------------------------------------------------------
          // Step 3: Clear Navidrome cache + trigger rescan
          // ----------------------------------------------------------------
          console.log('Step 3: Clearing Navidrome artwork cache and triggering rescan...');
          try {
            await rm(join(dataDir, 'cache'), { recursive: true, force: true });
          } catch {
            // Cache dir may not exist
          }
          await triggerNavidromeRescan(serverPort);

          // Give Navidrome time to fully process the rescan and regenerate artwork
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // ----------------------------------------------------------------
          // Step 4: Dry-run with --check-artwork → detect artwork-updated
          // ----------------------------------------------------------------
          console.log('Step 4: Dry-run sync to detect artwork changes...');
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

          const updateCount = dryRunJson?.plan?.tracksToUpdate ?? 0;
          const breakdown = dryRunJson?.plan?.updateBreakdown as
            | Record<string, number | undefined>
            | undefined;

          console.log('Artwork change detection result:');
          console.log(`  Tracks to update: ${updateCount}`);
          console.log(`  Update breakdown: ${JSON.stringify(breakdown)}`);

          expect(updateCount).toBeGreaterThan(0);
          expect(breakdown).toBeDefined();
          expect(breakdown?.['artwork-updated']).toBeGreaterThan(0);
          expect(breakdown?.['artwork-updated']).toBeGreaterThanOrEqual(3);

          // ----------------------------------------------------------------
          // Step 5: Actually sync with --check-artwork
          // ----------------------------------------------------------------
          console.log('Step 5: Syncing artwork updates...');
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

          // ----------------------------------------------------------------
          // Step 6: Idempotency — dry-run with --check-artwork → 0 updates
          // ----------------------------------------------------------------
          console.log('Step 6: Verifying idempotency after artwork sync...');
          const { result: idempResult, json: idempJson } = await runCliJson<SyncOutput>(
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

          expect(idempResult.exitCode).toBe(0);
          expect(idempJson?.plan?.tracksToUpdate).toBe(0);
          expect(idempJson?.plan?.tracksToAdd).toBe(0);
          console.log('Idempotency verified — no further updates needed');
        } finally {
          await cleanupTempConfig(configPath);
        }
      });
    },
    600000
  );
});
