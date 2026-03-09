/**
 * E2E tests for the `podkit list` command.
 *
 * Tests listing tracks on iPod in different formats.
 */

import { describe, it, expect } from 'bun:test';
import { runCli, runCliJson } from '../helpers/cli-runner';
import { withTarget } from '../targets';

interface ListTrack {
  title: string;
  artist: string;
  album: string;
  duration?: number;
  durationFormatted?: string;
}

describe('podkit list', () => {
  describe('from iPod', () => {
    it('lists tracks in table format', async () => {
      await withTarget(async (target) => {
        // Empty iPod should show "No tracks found"
        const result = await runCli(['list', '--device', target.path]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('No tracks found');
      });
    });

    it('outputs JSON with --json flag', async () => {
      await withTarget(async (target) => {
        const { result, json } = await runCliJson<ListTrack[]>([
          'list',
          '--device',
          target.path,
          '--json',
        ]);

        expect(result.exitCode).toBe(0);
        expect(Array.isArray(json)).toBe(true);
        expect(json?.length).toBe(0);
      });
    });

    it('outputs JSON with --format json', async () => {
      await withTarget(async (target) => {
        const { result, json } = await runCliJson<ListTrack[]>([
          'list',
          '--device',
          target.path,
          '--format',
          'json',
        ]);

        expect(result.exitCode).toBe(0);
        expect(Array.isArray(json)).toBe(true);
      });
    });

    it('outputs CSV with --format csv', async () => {
      await withTarget(async (target) => {
        const result = await runCli([
          'list',
          '--device',
          target.path,
          '--format',
          'csv',
        ]);

        expect(result.exitCode).toBe(0);
        // CSV header should be present
        expect(result.stdout).toContain('Title,Artist,Album,Duration');
      });
    });
  });

  describe('error handling', () => {
    it('fails when no device configured', async () => {
      // Use non-existent config to ensure we don't pick up user's config file
      const result = await runCli(['--config', '/nonexistent/config.toml', 'list']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('No iPod configured');
    });
  });
});
