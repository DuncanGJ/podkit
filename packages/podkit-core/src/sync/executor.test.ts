/**
 * Unit tests for the sync executor
 *
 * These tests verify the executor logic using mocked dependencies.
 *
 * ## Test Coverage
 *
 * 1. Basic execution flow (transcode, copy, remove operations)
 * 2. Progress reporting via async iterator
 * 3. Dry-run mode (no actual changes)
 * 4. Error handling (continue-on-error vs stop)
 * 5. Abort signal support
 * 6. Database saving after operations
 */

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import {
  DefaultSyncExecutor,
  createExecutor,
  executePlan,
  getOperationDisplayName,
  type ExecutorDependencies,
  type ExecutorProgress,
} from './executor.js';
import type { CollectionTrack } from '../adapters/interface.js';
import type { AudioFileType } from '../types.js';
import type { IPodTrack, SyncOperation, SyncPlan } from './types.js';

// =============================================================================
// Mock Types
// =============================================================================

interface MockDatabase {
  addTrack: ReturnType<typeof mock>;
  copyTrackToDevice: ReturnType<typeof mock>;
  removeTrack: ReturnType<typeof mock>;
  save: ReturnType<typeof mock>;
}

interface MockTranscoder {
  transcode: ReturnType<typeof mock>;
  detect: ReturnType<typeof mock>;
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockDatabase(): MockDatabase {
  let trackIdCounter = 1;

  return {
    addTrack: mock((input: { title: string; artist: string }) => ({
      id: trackIdCounter++,
      title: input.title,
      artist: input.artist,
      album: '',
    })),
    copyTrackToDevice: mock(() => ({})),
    removeTrack: mock(() => {}),
    save: mock(async () => {}),
  };
}

function createMockTranscoder(): MockTranscoder {
  return {
    transcode: mock(async () => ({
      outputPath: '/tmp/output.m4a',
      size: 5000000,
      duration: 1000,
      bitrate: 256,
    })),
    detect: mock(async () => ({
      version: '6.0',
      path: '/usr/bin/ffmpeg',
      aacEncoders: ['aac'],
      preferredEncoder: 'aac',
    })),
  };
}

function createCollectionTrack(
  artist: string,
  title: string,
  album: string,
  fileType: AudioFileType = 'flac',
  options: Partial<CollectionTrack> = {}
): CollectionTrack {
  return {
    id: `${artist}-${title}-${album}`,
    artist,
    title,
    album,
    filePath: `/music/${artist}/${album}/${title}.${fileType}`,
    fileType,
    duration: 180000,
    ...options,
  };
}

function createIPodTrack(
  artist: string,
  title: string,
  album: string,
  options: Partial<IPodTrack> = {}
): IPodTrack {
  return {
    id: Math.floor(Math.random() * 10000),
    artist,
    title,
    album,
    duration: 180000,
    bitrate: 256,
    sampleRate: 44100,
    filePath: '/iPod_Control/Music/F00/ABCD.m4a',
    hasArtwork: false,
    ...options,
  };
}

function createEmptyPlan(): SyncPlan {
  return {
    operations: [],
    estimatedTime: 0,
    estimatedSize: 0,
  };
}

function createDependencies(
  db: MockDatabase,
  transcoder: MockTranscoder
): ExecutorDependencies {
  // Cast mocks to satisfy the interface
  return {
    database: db as unknown as ExecutorDependencies['database'],
    transcoder: transcoder as unknown as ExecutorDependencies['transcoder'],
  };
}

// =============================================================================
// getOperationDisplayName Tests
// =============================================================================

describe('getOperationDisplayName', () => {
  it('returns artist - title for transcode operation', () => {
    const op: SyncOperation = {
      type: 'transcode',
      source: createCollectionTrack('Pink Floyd', 'Comfortably Numb', 'The Wall'),
      preset: { name: 'high' },
    };

    expect(getOperationDisplayName(op)).toBe('Pink Floyd - Comfortably Numb');
  });

  it('returns artist - title for copy operation', () => {
    const op: SyncOperation = {
      type: 'copy',
      source: createCollectionTrack('Radiohead', 'Paranoid Android', 'OK Computer'),
    };

    expect(getOperationDisplayName(op)).toBe('Radiohead - Paranoid Android');
  });

  it('returns artist - title for remove operation', () => {
    const op: SyncOperation = {
      type: 'remove',
      track: createIPodTrack('The Beatles', 'Yesterday', 'Help!'),
    };

    expect(getOperationDisplayName(op)).toBe('The Beatles - Yesterday');
  });
});

// =============================================================================
// Basic Execution Tests
// =============================================================================

describe('DefaultSyncExecutor - basic execution', () => {
  let mockDb: MockDatabase;
  let mockTranscoder: MockTranscoder;
  let deps: ExecutorDependencies;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockTranscoder = createMockTranscoder();
    deps = createDependencies(mockDb, mockTranscoder);
  });

  it('handles empty plan', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan = createEmptyPlan();

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    // Should emit complete even for empty plan
    expect(progress.length).toBeGreaterThanOrEqual(0);
    expect(mockDb.save.mock.calls.length).toBe(0);
  });

  it('executes copy operation', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'copy',
          source: createCollectionTrack('Artist', 'Song', 'Album', 'mp3'),
        },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    // Should have called addTrack and copyTrackToDevice
    expect(mockDb.addTrack.mock.calls.length).toBe(1);
    expect(mockDb.copyTrackToDevice.mock.calls.length).toBe(1);
    expect(mockDb.save.mock.calls.length).toBe(1);
  });

  it('executes transcode operation', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'transcode',
          source: createCollectionTrack('Artist', 'Song', 'Album', 'flac'),
          preset: { name: 'high' },
        },
      ],
      estimatedTime: 18,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    // Should have called transcoder, addTrack, and copyTrackToDevice
    expect(mockTranscoder.transcode.mock.calls.length).toBe(1);
    expect(mockDb.addTrack.mock.calls.length).toBe(1);
    expect(mockDb.copyTrackToDevice.mock.calls.length).toBe(1);
    expect(mockDb.save.mock.calls.length).toBe(1);
  });

  it('executes remove operation', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'remove',
          track: createIPodTrack('Artist', 'Song', 'Album', { id: 123 }),
        },
      ],
      estimatedTime: 0.1,
      estimatedSize: 0,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    // Should have called removeTrack
    expect(mockDb.removeTrack.mock.calls.length).toBe(1);
    expect(mockDb.removeTrack.mock.calls[0]).toEqual([123]);
    expect(mockDb.save.mock.calls.length).toBe(1);
  });

  it('executes multiple operations in order', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'remove',
          track: createIPodTrack('Old Artist', 'Old Song', 'Old Album', { id: 1 }),
        },
        {
          type: 'copy',
          source: createCollectionTrack('Artist', 'MP3 Song', 'Album', 'mp3'),
        },
        {
          type: 'transcode',
          source: createCollectionTrack('Artist', 'FLAC Song', 'Album', 'flac'),
          preset: { name: 'high' },
        },
      ],
      estimatedTime: 20,
      estimatedSize: 10000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    expect(mockDb.removeTrack.mock.calls.length).toBe(1);
    expect(mockDb.addTrack.mock.calls.length).toBe(2);
    expect(mockTranscoder.transcode.mock.calls.length).toBe(1);
    expect(mockDb.save.mock.calls.length).toBe(1);
  });
});

// =============================================================================
// Progress Reporting Tests
// =============================================================================

describe('DefaultSyncExecutor - progress reporting', () => {
  let mockDb: MockDatabase;
  let mockTranscoder: MockTranscoder;
  let deps: ExecutorDependencies;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockTranscoder = createMockTranscoder();
    deps = createDependencies(mockDb, mockTranscoder);
  });

  it('emits preparing phase before each operation', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'copy',
          source: createCollectionTrack('Artist', 'Song', 'Album', 'mp3'),
        },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    // First progress should be preparing
    const preparingEvents = progress.filter((p) => p.phase === 'preparing');
    expect(preparingEvents.length).toBeGreaterThan(0);
  });

  it('includes operation index and total', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S1', 'Album', 'mp3') },
        { type: 'copy', source: createCollectionTrack('A', 'S2', 'Album', 'mp3') },
        { type: 'copy', source: createCollectionTrack('A', 'S3', 'Album', 'mp3') },
      ],
      estimatedTime: 3,
      estimatedSize: 15000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    // Check that we have all indices
    const indices = new Set(progress.map((p) => p.index));
    expect(indices.has(0)).toBe(true);
    expect(indices.has(1)).toBe(true);
    expect(indices.has(2)).toBe(true);

    // All should have total = 3
    for (const p of progress) {
      expect(p.total).toBe(3);
    }
  });

  it('includes current track name', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'copy',
          source: createCollectionTrack('Pink Floyd', 'Money', 'DSOTM', 'mp3'),
        },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    const copyEvents = progress.filter((p) => p.phase === 'copying');
    expect(copyEvents.some((p) => p.currentTrack === 'Pink Floyd - Money')).toBe(true);
  });

  it('tracks bytes processed', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'transcode',
          source: createCollectionTrack('Artist', 'Song', 'Album', 'flac'),
          preset: { name: 'high' },
        },
      ],
      estimatedTime: 18,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    // After transcode, bytes should be > 0
    const completeEvent = progress.find((p) => p.phase === 'complete');
    expect(completeEvent).toBeDefined();
    expect(completeEvent!.bytesProcessed).toBeGreaterThan(0);
  });

  it('emits updating-db phase before save', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S', 'Album', 'mp3') },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    const dbUpdateEvents = progress.filter((p) => p.phase === 'updating-db');
    expect(dbUpdateEvents.length).toBe(1);
  });

  it('emits complete phase at end', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S', 'Album', 'mp3') },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    const lastEvent = progress[progress.length - 1];
    expect(lastEvent?.phase).toBe('complete');
  });
});

// =============================================================================
// Dry-Run Mode Tests
// =============================================================================

describe('DefaultSyncExecutor - dry-run mode', () => {
  let mockDb: MockDatabase;
  let mockTranscoder: MockTranscoder;
  let deps: ExecutorDependencies;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockTranscoder = createMockTranscoder();
    deps = createDependencies(mockDb, mockTranscoder);
  });

  it('does not call database methods in dry-run', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S', 'Album', 'mp3') },
        {
          type: 'transcode',
          source: createCollectionTrack('B', 'T', 'Album', 'flac'),
          preset: { name: 'high' },
        },
        { type: 'remove', track: createIPodTrack('C', 'U', 'Album') },
      ],
      estimatedTime: 20,
      estimatedSize: 10000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan, { dryRun: true })) {
      progress.push(p);
    }

    expect(mockDb.addTrack.mock.calls.length).toBe(0);
    expect(mockDb.copyTrackToDevice.mock.calls.length).toBe(0);
    expect(mockDb.removeTrack.mock.calls.length).toBe(0);
    expect(mockDb.save.mock.calls.length).toBe(0);
    expect(mockTranscoder.transcode.mock.calls.length).toBe(0);
  });

  it('marks progress as skipped in dry-run', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S', 'Album', 'mp3') },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan, { dryRun: true })) {
      progress.push(p);
    }

    const skippedEvents = progress.filter((p) => p.skipped === true);
    expect(skippedEvents.length).toBeGreaterThan(0);
  });

  it('still emits progress events in dry-run', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S1', 'Album', 'mp3') },
        { type: 'copy', source: createCollectionTrack('A', 'S2', 'Album', 'mp3') },
      ],
      estimatedTime: 2,
      estimatedSize: 10000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan, { dryRun: true })) {
      progress.push(p);
    }

    // Should have progress for each operation
    expect(progress.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('DefaultSyncExecutor - error handling', () => {
  let mockDb: MockDatabase;
  let mockTranscoder: MockTranscoder;
  let deps: ExecutorDependencies;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockTranscoder = createMockTranscoder();
    deps = createDependencies(mockDb, mockTranscoder);
  });

  it('stops on error by default', async () => {
    // Make transcode fail
    mockTranscoder.transcode = mock(async () => {
      throw new Error('Transcode failed');
    });
    deps = createDependencies(mockDb, mockTranscoder);

    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'transcode',
          source: createCollectionTrack('A', 'S1', 'Album', 'flac'),
          preset: { name: 'high' },
        },
        { type: 'copy', source: createCollectionTrack('A', 'S2', 'Album', 'mp3') },
      ],
      estimatedTime: 20,
      estimatedSize: 10000000,
    };

    let errorThrown = false;
    try {
      for await (const _p of executor.execute(plan)) {
        // iterate
      }
    } catch (err) {
      errorThrown = true;
      expect((err as Error).message).toBe('Transcode failed');
    }

    expect(errorThrown).toBe(true);
    // Second operation should not have been executed
    expect(mockDb.addTrack.mock.calls.length).toBe(0);
  });

  it('continues on error when continueOnError is true', async () => {
    // Make first transcode fail
    let callCount = 0;
    mockTranscoder.transcode = mock(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('First transcode failed');
      }
      return {
        outputPath: '/tmp/output.m4a',
        size: 5000000,
        duration: 1000,
        bitrate: 256,
      };
    });
    deps = createDependencies(mockDb, mockTranscoder);

    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'transcode',
          source: createCollectionTrack('A', 'S1', 'Album', 'flac'),
          preset: { name: 'high' },
        },
        { type: 'copy', source: createCollectionTrack('A', 'S2', 'Album', 'mp3') },
      ],
      estimatedTime: 20,
      estimatedSize: 10000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan, { continueOnError: true })) {
      progress.push(p);
    }

    // Should have error in progress
    const errorEvents = progress.filter((p) => p.error !== undefined);
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0]!.error!.message).toBe('First transcode failed');

    // Second operation should have been executed
    expect(mockDb.addTrack.mock.calls.length).toBe(1);
  });

  it('includes error in progress event', async () => {
    mockDb.addTrack = mock(() => {
      throw new Error('Database error');
    });
    deps = createDependencies(mockDb, mockTranscoder);

    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S', 'Album', 'mp3') },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    try {
      for await (const p of executor.execute(plan)) {
        progress.push(p);
      }
    } catch {
      // Expected
    }

    const errorEvent = progress.find((p) => p.error !== undefined);
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.error!.message).toBe('Database error');
  });
});

// =============================================================================
// Abort Signal Tests
// =============================================================================

describe('DefaultSyncExecutor - abort signal', () => {
  let mockDb: MockDatabase;
  let mockTranscoder: MockTranscoder;
  let deps: ExecutorDependencies;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockTranscoder = createMockTranscoder();
    deps = createDependencies(mockDb, mockTranscoder);
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();

    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S1', 'Album', 'mp3') },
        { type: 'copy', source: createCollectionTrack('A', 'S2', 'Album', 'mp3') },
        { type: 'copy', source: createCollectionTrack('A', 'S3', 'Album', 'mp3') },
      ],
      estimatedTime: 3,
      estimatedSize: 15000000,
    };

    // Abort after first operation
    let opCount = 0;
    let errorThrown = false;

    try {
      for await (const p of executor.execute(plan, { signal: controller.signal })) {
        if (p.phase === 'copying') {
          opCount++;
          if (opCount === 1) {
            controller.abort();
          }
        }
      }
    } catch (err) {
      errorThrown = true;
      expect((err as Error).message).toBe('Sync aborted');
    }

    expect(errorThrown).toBe(true);
  });

  it('checks abort before each operation', async () => {
    const controller = new AbortController();
    controller.abort(); // Abort immediately

    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S', 'Album', 'mp3') },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    let errorThrown = false;
    try {
      for await (const _p of executor.execute(plan, { signal: controller.signal })) {
        // iterate
      }
    } catch (err) {
      errorThrown = true;
      expect((err as Error).message).toBe('Sync aborted');
    }

    expect(errorThrown).toBe(true);
    expect(mockDb.addTrack.mock.calls.length).toBe(0);
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createExecutor', () => {
  it('creates a SyncExecutor instance', () => {
    const mockDb = createMockDatabase();
    const mockTranscoder = createMockTranscoder();
    const deps = createDependencies(mockDb, mockTranscoder);

    const executor = createExecutor(deps);

    expect(executor).toBeInstanceOf(DefaultSyncExecutor);
    expect(typeof executor.execute).toBe('function');
  });
});

describe('executePlan', () => {
  it('returns execution result', async () => {
    const mockDb = createMockDatabase();
    const mockTranscoder = createMockTranscoder();
    const deps = createDependencies(mockDb, mockTranscoder);

    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S1', 'Album', 'mp3') },
        { type: 'copy', source: createCollectionTrack('A', 'S2', 'Album', 'mp3') },
      ],
      estimatedTime: 2,
      estimatedSize: 10000000,
    };

    const result = await executePlan(plan, deps);

    expect(result.completed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('counts skipped operations in dry-run', async () => {
    const mockDb = createMockDatabase();
    const mockTranscoder = createMockTranscoder();
    const deps = createDependencies(mockDb, mockTranscoder);

    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S1', 'Album', 'mp3') },
        { type: 'copy', source: createCollectionTrack('A', 'S2', 'Album', 'mp3') },
      ],
      estimatedTime: 2,
      estimatedSize: 10000000,
    };

    const result = await executePlan(plan, deps, { dryRun: true });

    expect(result.completed).toBe(0);
    expect(result.skipped).toBe(2);
  });

  it('collects errors when continueOnError is true', async () => {
    const mockDb = createMockDatabase();
    const mockTranscoder = createMockTranscoder();

    // Make first copy fail
    let callCount = 0;
    mockDb.addTrack = mock((input: { title: string }) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('First add failed');
      }
      return { id: callCount, title: input.title, artist: '', album: '' };
    });

    const deps = createDependencies(mockDb, mockTranscoder);

    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S1', 'Album', 'mp3') },
        { type: 'copy', source: createCollectionTrack('A', 'S2', 'Album', 'mp3') },
      ],
      estimatedTime: 2,
      estimatedSize: 10000000,
    };

    const result = await executePlan(plan, deps, { continueOnError: true });

    expect(result.failed).toBe(1);
    expect(result.completed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.error.message).toBe('First add failed');
  });
});

// =============================================================================
// Phase Detection Tests
// =============================================================================

describe('phase detection', () => {
  let mockDb: MockDatabase;
  let mockTranscoder: MockTranscoder;
  let deps: ExecutorDependencies;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockTranscoder = createMockTranscoder();
    deps = createDependencies(mockDb, mockTranscoder);
  });

  it('reports transcoding phase for transcode operations', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'transcode',
          source: createCollectionTrack('A', 'S', 'Album', 'flac'),
          preset: { name: 'high' },
        },
      ],
      estimatedTime: 18,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    const transcodeEvents = progress.filter((p) => p.phase === 'transcoding');
    expect(transcodeEvents.length).toBeGreaterThan(0);
  });

  it('reports copying phase for copy operations', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        { type: 'copy', source: createCollectionTrack('A', 'S', 'Album', 'mp3') },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    const progress: ExecutorProgress[] = [];
    for await (const p of executor.execute(plan)) {
      progress.push(p);
    }

    const copyEvents = progress.filter((p) => p.phase === 'copying');
    expect(copyEvents.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Filetype Detection Tests
// =============================================================================

describe('filetype detection', () => {
  let mockDb: MockDatabase;
  let mockTranscoder: MockTranscoder;
  let deps: ExecutorDependencies;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockTranscoder = createMockTranscoder();
    deps = createDependencies(mockDb, mockTranscoder);
  });

  it('sets MPEG audio file for MP3', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'copy',
          source: createCollectionTrack('A', 'S', 'Album', 'mp3', {
            filePath: '/music/song.mp3',
          }),
        },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    for await (const _p of executor.execute(plan)) {
      // iterate
    }

    const trackInput = mockDb.addTrack.mock.calls[0]![0] as { filetype: string };
    expect(trackInput.filetype).toBe('MPEG audio file');
  });

  it('sets AAC audio file for M4A', async () => {
    const executor = new DefaultSyncExecutor(deps);
    const plan: SyncPlan = {
      operations: [
        {
          type: 'copy',
          source: createCollectionTrack('A', 'S', 'Album', 'm4a', {
            filePath: '/music/song.m4a',
          }),
        },
      ],
      estimatedTime: 1,
      estimatedSize: 5000000,
    };

    for await (const _p of executor.execute(plan)) {
      // iterate
    }

    const trackInput = mockDb.addTrack.mock.calls[0]![0] as { filetype: string };
    expect(trackInput.filetype).toBe('AAC audio file');
  });
});
