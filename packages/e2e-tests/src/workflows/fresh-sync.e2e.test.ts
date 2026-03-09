/**
 * E2E workflow test: Fresh sync from empty iPod.
 *
 * Tests the complete user journey:
 * 1. Initialize config
 * 2. Sync music to empty iPod
 * 3. Verify with status command
 * 4. List synced tracks
 *
 * This validates the entire sync pipeline works end-to-end.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli, runCliJson } from '../helpers/cli-runner';
import { withTarget } from '../targets';
import { areFixturesAvailable, Albums, getAlbumDir } from '../helpers/fixtures';

interface StatusOutput {
  connected: boolean;
  tracks?: number;
}

interface SyncOutput {
  success: boolean;
  result?: {
    completed: number;
  };
}

interface ListTrack {
  title: string;
  artist: string;
  album: string;
}

/**
 * Create a temp config file with the given music collection path
 */
async function createTempConfig(musicPath: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'podkit-fresh-sync-config-'));
  const configPath = join(tempDir, 'config.toml');

  const content = `[music.main]
path = "${musicPath}"

[defaults]
music = "main"
`;

  await writeFile(configPath, content);
  return configPath;
}

describe('workflow: fresh sync', () => {
  let fixturesAvailable: boolean;

  beforeAll(async () => {
    fixturesAvailable = await areFixturesAvailable();
  });

  it('completes full sync workflow: init -> sync -> status -> list', async () => {
    if (!fixturesAvailable) {
      console.log('Skipping: fixtures not available');
      return;
    }

    await withTarget(async (target) => {
      const sourcePath = getAlbumDir(Albums.GOLDBERG_SELECTIONS);

      // Create a temporary config file with music collection
      const configPath = await createTempConfig(sourcePath);

      try {
        // Step 1: Verify initial status (empty iPod)
        console.log('Step 1: Verify initial status');
        const { json: statusBefore } = await runCliJson<StatusOutput>([
          'status',
          '--device',
          target.path,
          '--json',
        ]);
        expect(statusBefore?.connected).toBe(true);
        expect(statusBefore?.tracks).toBe(0);

        // Step 2: Dry-run sync to preview changes
        console.log('Step 2: Dry-run sync');
        const dryRunResult = await runCli([
          '--config',
          configPath,
          'sync',
          '--device',
          target.path,
          '--dry-run',
        ]);
        expect(dryRunResult.exitCode).toBe(0);
        expect(dryRunResult.stdout).toContain('Dry Run');
        expect(dryRunResult.stdout).toContain('3'); // 3 tracks

        // Step 3: Execute actual sync
        console.log('Step 3: Execute sync');
        const { result: syncResult, json: syncJson } = await runCliJson<SyncOutput>([
          '--config',
          configPath,
          'sync',
          '--device',
          target.path,
          '--json',
        ]);
        expect(syncResult.exitCode).toBe(0);
        expect(syncJson?.success).toBe(true);
        expect(syncJson?.result?.completed).toBe(3);

        // Step 4: Verify status after sync
        console.log('Step 4: Verify status after sync');
        const { json: statusAfter } = await runCliJson<StatusOutput>([
          'status',
          '--device',
          target.path,
          '--json',
        ]);
        expect(statusAfter?.connected).toBe(true);
        expect(statusAfter?.tracks).toBe(3);

        // Step 5: List synced tracks
        console.log('Step 5: List synced tracks');
        const { json: tracks } = await runCliJson<ListTrack[]>([
          'list',
          '--device',
          target.path,
          '--json',
        ]);
        expect(tracks?.length).toBe(3);

        // Verify track metadata was preserved
        const titles = tracks?.map((t) => t.title).sort() ?? [];
        expect(titles).toEqual(['Harmony', 'Tremolo', 'Vibrato']);

        const artists = new Set(tracks?.map((t) => t.artist) ?? []);
        expect(artists.size).toBe(1);
        expect(artists.has('Podkit Test Generator')).toBe(true);

        // Step 6: Verify iPod database integrity
        console.log('Step 6: Verify database integrity');
        const verifyResult = await target.verify();
        expect(verifyResult.valid).toBe(true);
        expect(verifyResult.trackCount).toBe(3);

        console.log('Workflow complete!');
      } finally {
        const configDir = join(configPath, '..');
        await rm(configDir, { recursive: true, force: true });
      }
    });
  }, 120000); // 2 min timeout for full workflow with transcoding
});
