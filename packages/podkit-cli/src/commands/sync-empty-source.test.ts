/**
 * Tests for the empty source abort safety guard.
 *
 * When a collection adapter returns zero tracks, the sync should refuse
 * to proceed, preventing accidental mass deletion if --delete is enabled.
 */

import { describe, expect, it, mock } from 'bun:test';
import { OutputContext } from '../output/index.js';
import { syncVideoCollection } from './sync.js';
import type { VideoSyncContext } from './sync.js';

/**
 * Create a silent OutputContext for testing (suppresses all output)
 */
function createTestOutput(mode: 'text' | 'json' = 'text'): OutputContext {
  return new OutputContext({
    mode,
    quiet: true,
    verbose: 0,
    color: false,
    tips: false,
  });
}

/**
 * Create a mock video adapter that returns zero videos
 */
function createMockVideoAdapter() {
  return {
    connect: mock(async () => {}),
    disconnect: mock(async () => {}),
    getVideos: mock(async () => []),
  };
}

/**
 * Create minimal video sync context with defaults.
 */
function createVideoCtx(
  overrides: Partial<{
    collectionName: string;
    sourcePath: string;
    devicePath: string;
    mode: 'text' | 'json';
  }> = {}
) {
  const mockVideoAdapter = createMockVideoAdapter();
  const ctx: VideoSyncContext = {
    out: createTestOutput(overrides.mode ?? 'text'),
    collection: {
      name: overrides.collectionName ?? 'movies',
      type: 'video' as const,
      config: { path: overrides.sourcePath ?? '/fake/videos' },
    },
    sourcePath: overrides.sourcePath ?? '/fake/videos',
    devicePath: overrides.devicePath ?? '/fake/ipod',
    dryRun: false,
    removeOrphans: false,
    effectiveVideoQuality: 'high' as const,
    effectiveVideoTransforms: {
      showLanguage: { enabled: false, format: '', expand: false },
    },
    forceMetadata: false,
    ipod: null as never,
    core: {
      createVideoDirectoryAdapter: () => mockVideoAdapter,
    } as never,
  };
  return { ctx, mockVideoAdapter };
}

describe('empty source abort', () => {
  describe('video collection with zero tracks', () => {
    it('returns failure when adapter returns zero videos', async () => {
      const { ctx } = createVideoCtx();
      const result = await syncVideoCollection(ctx);

      expect(result.success).toBe(false);
      expect(result.completed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('error message includes collection name', async () => {
      const { ctx } = createVideoCtx({ collectionName: 'tv-shows', mode: 'json' });
      const result = await syncVideoCollection(ctx);

      expect(result.success).toBe(false);
      expect(result.jsonOutput).toBeDefined();
      expect(result.jsonOutput!.success).toBe(false);
      expect(result.jsonOutput!.error).toContain("'tv-shows'");
      expect(result.jsonOutput!.error).toContain('zero videos');
      expect(result.jsonOutput!.error).toContain('Check your source configuration');
    });

    it('includes source and device in JSON output', async () => {
      const { ctx } = createVideoCtx({
        sourcePath: '/videos/collection',
        devicePath: '/Volumes/iPod',
        mode: 'json',
      });
      const result = await syncVideoCollection(ctx);

      expect(result.jsonOutput!.source).toBe('/videos/collection');
      expect(result.jsonOutput!.device).toBe('/Volumes/iPod');
    });

    it('returns no JSON output in text mode', async () => {
      const { ctx } = createVideoCtx({ mode: 'text' });
      const result = await syncVideoCollection(ctx);

      expect(result.success).toBe(false);
      expect(result.jsonOutput).toBeUndefined();
    });

    it('disconnects adapter after zero-track abort (text mode)', async () => {
      const { ctx, mockVideoAdapter } = createVideoCtx({ mode: 'text' });
      await syncVideoCollection(ctx);

      expect(mockVideoAdapter.disconnect).toHaveBeenCalled();
    });

    it('disconnects adapter after zero-track abort (JSON mode)', async () => {
      const { ctx, mockVideoAdapter } = createVideoCtx({ mode: 'json' });
      await syncVideoCollection(ctx);

      expect(mockVideoAdapter.disconnect).toHaveBeenCalled();
    });

    it('JSON output has correct structure', async () => {
      const { ctx } = createVideoCtx({ collectionName: 'main', mode: 'json' });
      const result = await syncVideoCollection(ctx);

      const json = result.jsonOutput!;
      expect(json).toEqual(
        expect.objectContaining({
          success: false,
          dryRun: false,
          source: '/fake/videos',
          device: '/fake/ipod',
          error: expect.stringContaining('zero videos'),
        })
      );
    });
  });
});
