/**
 * Unit tests for the unified executor
 *
 * Tests the generic UnifiedExecutor that delegates to ContentTypeHandler.
 * Uses minimal mock handlers to verify both per-operation and batch
 * execution paths.
 */

import { describe, expect, it } from 'bun:test';
import { UnifiedExecutor, createUnifiedExecutor } from './unified-executor.js';
import type { ContentTypeHandler, ExecutionContext, OperationProgress } from './content-type.js';
import type {
  SyncOperation,
  SyncPlan,
  UpdateReason,
  ExecutorProgress,
  ExecuteResult,
} from './types.js';

// =============================================================================
// Test Types
// =============================================================================

interface TestSource {
  id: string;
  name: string;
}

interface TestDevice {
  deviceId: string;
  name: string;
}

// =============================================================================
// Helpers
// =============================================================================

function makePlan(operations: SyncOperation[], estimatedSize = 1000): SyncPlan {
  return {
    operations,
    estimatedTime: operations.length * 10,
    estimatedSize,
    warnings: [],
  };
}

function makeCopyOp(name: string): SyncOperation {
  return { type: 'copy', source: { filePath: name, fileType: 'mp3' } as any };
}

function makeTranscodeOp(name: string): SyncOperation {
  return {
    type: 'transcode',
    source: { filePath: name, fileType: 'flac' } as any,
    preset: { name: 'high' },
  };
}

function makeRemoveOp(name: string): SyncOperation {
  return { type: 'remove', track: { filePath: name } as any };
}

/**
 * Consume an async generator, collecting yielded values and returning the return value
 */
async function consumeExecutor(
  gen: AsyncGenerator<ExecutorProgress, ExecuteResult>
): Promise<{ events: ExecutorProgress[]; result: ExecuteResult }> {
  const events: ExecutorProgress[] = [];
  let done = false;
  let result!: ExecuteResult;

  while (!done) {
    const next = await gen.next();
    if (next.done) {
      result = next.value;
      done = true;
    } else {
      events.push(next.value);
    }
  }

  return { events, result };
}

// =============================================================================
// Mock Handler
// =============================================================================

function createMockHandler(
  overrides: Partial<ContentTypeHandler<TestSource, TestDevice>> = {}
): ContentTypeHandler<TestSource, TestDevice> {
  return {
    type: 'test',

    generateMatchKey: (source: TestSource) => source.name.toLowerCase(),
    generateDeviceMatchKey: (device: TestDevice) => device.name.toLowerCase(),
    getDeviceItemId: (device: TestDevice) => device.deviceId,
    detectUpdates: (): UpdateReason[] => [],

    planAdd: (source: TestSource): SyncOperation => ({
      type: 'copy',
      source: { filePath: source.name, fileType: 'mp3' } as any,
    }),

    planRemove: (device: TestDevice): SyncOperation => ({
      type: 'remove',
      track: { filePath: device.name } as any,
    }),

    planUpdate: (): SyncOperation[] => [],
    estimateSize: () => 1000,
    estimateTime: () => 1,

    async *execute(op: SyncOperation, _ctx: ExecutionContext): AsyncGenerator<OperationProgress> {
      yield { operation: op, phase: 'starting' };
      yield { operation: op, phase: 'complete' };
    },

    getDeviceItems: () => [],
    getDisplayName: (op: SyncOperation) => {
      if ('source' in op && op.source && 'filePath' in op.source) return op.source.filePath;
      if ('track' in op && op.track && 'filePath' in op.track) return op.track.filePath;
      return 'unknown';
    },
    formatDryRun: () => ({
      toAdd: 0,
      toRemove: 0,
      existing: 0,
      toUpdate: 0,
      operationCounts: {},
      estimatedSize: 0,
      estimatedTime: 0,
      warnings: [],
      operations: [],
    }),

    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('UnifiedExecutor', () => {
  describe('per-operation execution', () => {
    it('executes operations in order and yields progress', async () => {
      const handler = createMockHandler();
      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3'), makeRemoveOp('c.mp3')]);

      const { events, result } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      // Each operation yields starting + complete = 2 events per op
      expect(events.length).toBe(6);
      expect(result.completed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('sets correct index and total on progress events', async () => {
      const handler = createMockHandler();
      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3')]);

      const { events } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      // First operation events: index=0, total=2
      expect(events[0]!.index).toBe(0);
      expect(events[0]!.total).toBe(2);

      // Second operation events: index=1, total=2
      expect(events[2]!.index).toBe(1);
      expect(events[2]!.total).toBe(2);
    });

    it('maps operation types to correct phases', async () => {
      const handler = createMockHandler();
      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([
        makeCopyOp('a.mp3'),
        makeTranscodeOp('b.flac'),
        makeRemoveOp('c.mp3'),
      ]);

      const { events } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      expect(events[0]!.phase).toBe('copying');
      expect(events[2]!.phase).toBe('transcoding');
      expect(events[4]!.phase).toBe('removing');
    });
  });

  describe('batch execution', () => {
    it('uses executeBatch when handler provides it', async () => {
      let batchCalled = false;

      const handler = createMockHandler({
        async *executeBatch(
          operations: SyncOperation[],
          _ctx: ExecutionContext
        ): AsyncGenerator<OperationProgress> {
          batchCalled = true;
          for (const op of operations) {
            yield { operation: op, phase: 'starting' };
            yield { operation: op, phase: 'complete' };
          }
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3')]);

      const { result } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      expect(batchCalled).toBe(true);
      expect(result.completed).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('does not use executeBatch in dry-run mode', async () => {
      let batchCalled = false;

      const handler = createMockHandler({
        async *executeBatch(): AsyncGenerator<OperationProgress> {
          batchCalled = true;
          return;
          yield; // satisfy require-yield
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3')]);

      const { result } = await consumeExecutor(executor.execute(plan, { dryRun: true }));

      expect(batchCalled).toBe(false);
      expect(result.skipped).toBe(1);
    });
  });

  describe('error handling', () => {
    it('categorizes errors and tracks failed count', async () => {
      const handler = createMockHandler({
        async *execute(op: SyncOperation): AsyncGenerator<OperationProgress> {
          yield { operation: op, phase: 'starting' };
          throw new Error('FFmpeg transcode failed');
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeTranscodeOp('a.flac')]);

      const { events, result } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
      expect(result.categorizedErrors.length).toBe(1);
      expect(result.categorizedErrors[0]!.category).toBe('transcode');

      // Error progress event should have categorizedError
      const errorEvent = events.find((e) => e.categorizedError);
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.error!.message).toBe('FFmpeg transcode failed');
    });

    it('stops on error when continueOnError is false', async () => {
      let executeCount = 0;
      const handler = createMockHandler({
        async *execute(op: SyncOperation): AsyncGenerator<OperationProgress> {
          executeCount++;
          if (executeCount === 1) {
            throw new Error('first op failed');
          }
          yield { operation: op, phase: 'complete' };
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3')]);

      const { result } = await consumeExecutor(
        executor.execute(plan, { ipod: {} as any, continueOnError: false })
      );

      expect(executeCount).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.completed).toBe(0);
    });

    it('continues on error when continueOnError is true', async () => {
      let executeCount = 0;
      const handler = createMockHandler({
        async *execute(op: SyncOperation): AsyncGenerator<OperationProgress> {
          executeCount++;
          if (executeCount === 1) {
            throw new Error('first op failed');
          }
          yield { operation: op, phase: 'starting' };
          yield { operation: op, phase: 'complete' };
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3')]);

      const { result } = await consumeExecutor(
        executor.execute(plan, { ipod: {} as any, continueOnError: true })
      );

      expect(executeCount).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.completed).toBe(1);
    });

    it('handles errors in batch execution path', async () => {
      const handler = createMockHandler({
        async *executeBatch(operations: SyncOperation[]): AsyncGenerator<OperationProgress> {
          yield { operation: operations[0]!, phase: 'starting' };
          yield { operation: operations[0]!, phase: 'failed', error: new Error('batch error') };
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3')]);

      const { result } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      expect(result.failed).toBe(1);
      expect(result.categorizedErrors.length).toBe(1);
    });

    it('handles batch generator throwing', async () => {
      const handler = createMockHandler({
        async *executeBatch(): AsyncGenerator<OperationProgress> {
          throw new Error('batch generator exploded');
          yield; // satisfy require-yield
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3')]);

      const { result } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      expect(result.failed).toBe(1);
      expect(result.categorizedErrors[0]!.error.message).toBe('batch generator exploded');
    });
  });

  describe('abort signal', () => {
    it('stops execution when signal is aborted', async () => {
      let executeCount = 0;
      const handler = createMockHandler({
        async *execute(op: SyncOperation): AsyncGenerator<OperationProgress> {
          executeCount++;
          yield { operation: op, phase: 'starting' };
          yield { operation: op, phase: 'complete' };
        },
      });

      const controller = new AbortController();
      // Abort before execution begins
      controller.abort();

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3')]);

      const { result } = await consumeExecutor(
        executor.execute(plan, { ipod: {} as any, signal: controller.signal })
      );

      expect(executeCount).toBe(0);
      expect(result.aborted).toBe(true);
      expect(result.completed).toBe(0);
    });

    it('stops between operations when signal is aborted mid-execution', async () => {
      let executeCount = 0;
      const controller = new AbortController();

      const handler = createMockHandler({
        async *execute(op: SyncOperation): AsyncGenerator<OperationProgress> {
          executeCount++;
          yield { operation: op, phase: 'starting' };
          yield { operation: op, phase: 'complete' };
          // Abort after first operation completes
          if (executeCount === 1) controller.abort();
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3'), makeCopyOp('c.mp3')]);

      const { result } = await consumeExecutor(
        executor.execute(plan, { ipod: {} as any, signal: controller.signal })
      );

      expect(executeCount).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.aborted).toBe(true);
    });
  });

  describe('dry-run mode', () => {
    it('yields skipped progress for each operation without executing', async () => {
      let executeCalled = false;
      const handler = createMockHandler({
        async *execute(op: SyncOperation): AsyncGenerator<OperationProgress> {
          executeCalled = true;
          yield { operation: op, phase: 'complete' };
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeTranscodeOp('b.flac')]);

      const { events, result } = await consumeExecutor(executor.execute(plan, { dryRun: true }));

      expect(executeCalled).toBe(false);
      expect(result.skipped).toBe(2);
      expect(result.completed).toBe(0);
      expect(events.length).toBe(2);
      expect(events[0]!.skipped).toBe(true);
      expect(events[1]!.skipped).toBe(true);
    });

    it('sets correct phases in dry-run mode', async () => {
      const handler = createMockHandler();
      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeRemoveOp('b.mp3')]);

      const { events } = await consumeExecutor(executor.execute(plan, { dryRun: true }));

      expect(events[0]!.phase).toBe('copying');
      expect(events[1]!.phase).toBe('removing');
    });
  });

  describe('checkpoint saves', () => {
    it('calls ipod.save() at saveInterval', async () => {
      let saveCount = 0;
      const mockIpod = {
        save: async () => {
          saveCount++;
        },
      } as any;

      const handler = createMockHandler();
      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([
        makeCopyOp('a.mp3'),
        makeCopyOp('b.mp3'),
        makeCopyOp('c.mp3'),
        makeCopyOp('d.mp3'),
        makeCopyOp('e.mp3'),
      ]);

      await consumeExecutor(executor.execute(plan, { ipod: mockIpod, saveInterval: 2 }));

      // 5 completed, saveInterval=2 -> save at completed=2 and completed=4
      expect(saveCount).toBe(2);
    });

    it('does not save when saveInterval is 0', async () => {
      let saveCount = 0;
      const mockIpod = {
        save: async () => {
          saveCount++;
        },
      } as any;

      const handler = createMockHandler();
      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3')]);

      await consumeExecutor(executor.execute(plan, { ipod: mockIpod, saveInterval: 0 }));

      expect(saveCount).toBe(0);
    });

    it('calls ipod.save() in batch path at saveInterval', async () => {
      let saveCount = 0;
      const mockIpod = {
        save: async () => {
          saveCount++;
        },
      } as any;

      const handler = createMockHandler({
        async *executeBatch(operations: SyncOperation[]): AsyncGenerator<OperationProgress> {
          for (const op of operations) {
            yield { operation: op, phase: 'starting' };
            yield { operation: op, phase: 'complete' };
          }
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3'), makeCopyOp('c.mp3')]);

      await consumeExecutor(executor.execute(plan, { ipod: mockIpod, saveInterval: 2 }));

      // 3 completed, saveInterval=2 -> save at completed=2
      expect(saveCount).toBe(1);
    });
  });

  describe('transcodeProgress forwarding', () => {
    it('forwards transcodeProgress from handler to executor progress', async () => {
      const handler = createMockHandler({
        async *execute(op: SyncOperation): AsyncGenerator<OperationProgress> {
          yield {
            operation: op,
            phase: 'in-progress',
            transcodeProgress: { percent: 50, speed: '2.0' },
          };
          yield { operation: op, phase: 'complete' };
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeTranscodeOp('a.flac')]);

      const { events } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      const progressEvent = events.find((e) => e.transcodeProgress);
      expect(progressEvent).toBeDefined();
      expect(progressEvent!.transcodeProgress!.percent).toBe(50);
    });

    it('forwards transcodeProgress through batch execution path', async () => {
      const handler = createMockHandler({
        async *executeBatch(operations: SyncOperation[]): AsyncGenerator<OperationProgress> {
          for (const op of operations) {
            yield { operation: op, phase: 'starting' };
            yield {
              operation: op,
              phase: 'in-progress',
              transcodeProgress: { percent: 75, speed: '1.5' },
            };
            yield { operation: op, phase: 'complete' };
          }
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeTranscodeOp('a.flac')]);

      const { events } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      const progressEvent = events.find((e) => e.transcodeProgress);
      expect(progressEvent).toBeDefined();
      expect(progressEvent!.transcodeProgress!.percent).toBe(75);
      expect(progressEvent!.transcodeProgress!.speed).toBe(1.5);
    });
  });

  describe('result aggregation', () => {
    it('returns correct totals for mixed success/failure', async () => {
      let callCount = 0;
      const handler = createMockHandler({
        async *execute(op: SyncOperation): AsyncGenerator<OperationProgress> {
          callCount++;
          if (callCount === 2) {
            throw new Error('failed');
          }
          yield { operation: op, phase: 'starting' };
          yield { operation: op, phase: 'complete' };
        },
      });

      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([makeCopyOp('a.mp3'), makeCopyOp('b.mp3'), makeCopyOp('c.mp3')]);

      const { result } = await consumeExecutor(
        executor.execute(plan, { ipod: {} as any, continueOnError: true })
      );

      expect(result.completed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.categorizedErrors.length).toBe(1);
    });

    it('returns empty result for empty plan', async () => {
      const handler = createMockHandler();
      const executor = new UnifiedExecutor(handler);
      const plan = makePlan([]);

      const { events, result } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));

      expect(events.length).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('createUnifiedExecutor factory', () => {
    it('creates an executor instance', async () => {
      const handler = createMockHandler();
      const executor = createUnifiedExecutor(handler);

      expect(executor).toBeInstanceOf(UnifiedExecutor);

      const plan = makePlan([makeCopyOp('a.mp3')]);
      const { result } = await consumeExecutor(executor.execute(plan, { ipod: {} as any }));
      expect(result.completed).toBe(1);
    });
  });
});
