/**
 * Sync executor - executes sync plans
 *
 * The executor takes a SyncPlan (from the planner) and executes each operation:
 * - transcode: Convert audio with FFmpeg, then add to iPod
 * - copy: Add track to iPod directly
 * - remove: Remove track from iPod database
 *
 * Features:
 * - Progress reporting via async iterator
 * - Dry-run mode (simulate without writing)
 * - Error handling with continue-on-error option
 * - Abort signal support for cancellation
 *
 * @module
 */

import { mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';

import type { Database, Track, TrackInput } from '@podkit/libgpod-node';
import type { CollectionTrack } from '../adapters/interface.js';
import type { FFmpegTranscoder } from '../transcode/ffmpeg.js';
import { PRESETS, type TranscodePreset } from '../transcode/types.js';
import type {
  ExecuteOptions,
  SyncExecutor,
  SyncOperation,
  SyncPlan,
  SyncProgress,
  TranscodePresetRef,
} from './types.js';

// =============================================================================
// Extended Types
// =============================================================================

/**
 * Extended progress information for sync operations
 */
export interface ExecutorProgress extends SyncProgress {
  /** Current operation being executed */
  operation: SyncOperation;
  /** Index of current operation (0-based) */
  index: number;
  /** Error if operation failed */
  error?: Error;
  /** Whether this operation was skipped (dry-run) */
  skipped?: boolean;
}

/**
 * Extended options for sync execution
 */
export interface ExtendedExecuteOptions extends ExecuteOptions {
  /** Continue executing remaining operations after an error */
  continueOnError?: boolean;
  /** Temporary directory for transcoded files (defaults to system temp) */
  tempDir?: string;
}

/**
 * Result of sync execution
 */
export interface ExecuteResult {
  /** Number of operations completed successfully */
  completed: number;
  /** Number of operations that failed */
  failed: number;
  /** Number of operations skipped (dry-run) */
  skipped: number;
  /** Errors encountered during execution */
  errors: Array<{ operation: SyncOperation; error: Error }>;
  /** Total bytes transferred */
  bytesTransferred: number;
}

/**
 * Dependencies required by the executor
 */
export interface ExecutorDependencies {
  /** iPod database connection */
  database: Database;
  /** FFmpeg transcoder for audio conversion */
  transcoder: FFmpegTranscoder;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the preset configuration from a preset reference
 */
function getPreset(ref: TranscodePresetRef): TranscodePreset {
  if (ref.name === 'custom') {
    return PRESETS.medium;
  }
  return PRESETS[ref.name];
}

/**
 * Convert CollectionTrack to TrackInput for libgpod
 */
function toTrackInput(track: CollectionTrack): TrackInput {
  return {
    title: track.title,
    artist: track.artist,
    album: track.album,
    albumArtist: track.albumArtist,
    genre: track.genre,
    year: track.year,
    trackNumber: track.trackNumber,
    discNumber: track.discNumber,
    duration: track.duration,
  };
}

/**
 * Get a display name for an operation (for progress reporting)
 */
export function getOperationDisplayName(operation: SyncOperation): string {
  switch (operation.type) {
    case 'transcode':
      return `${operation.source.artist} - ${operation.source.title}`;
    case 'copy':
      return `${operation.source.artist} - ${operation.source.title}`;
    case 'remove':
      return `${operation.track.artist} - ${operation.track.title}`;
    case 'update-metadata':
      return `${operation.track.artist} - ${operation.track.title}`;
  }
}

/**
 * Calculate total bytes for a plan
 */
function calculateTotalBytes(plan: SyncPlan): number {
  // Use the estimated size from the plan
  return plan.estimatedSize;
}

// =============================================================================
// Executor Implementation
// =============================================================================

/**
 * Default sync executor implementation
 */
export class DefaultSyncExecutor implements SyncExecutor {
  private database: Database;
  private transcoder: FFmpegTranscoder;

  constructor(deps: ExecutorDependencies) {
    this.database = deps.database;
    this.transcoder = deps.transcoder;
  }

  /**
   * Execute a sync plan
   *
   * Yields progress updates for each operation. In dry-run mode,
   * operations are simulated without making actual changes.
   */
  async *execute(
    plan: SyncPlan,
    options: ExtendedExecuteOptions = {}
  ): AsyncIterable<ExecutorProgress> {
    const {
      dryRun = false,
      continueOnError = false,
      signal,
      tempDir = tmpdir(),
    } = options;

    const total = plan.operations.length;
    const totalBytes = calculateTotalBytes(plan);
    let bytesProcessed = 0;
    let completed = 0;
    let failed = 0;
    // Track skipped operations for dry-run mode
    let _skipped = 0;

    // Create temp directory for transcoded files if needed
    const transcodeDir = join(tempDir, `podkit-transcode-${randomUUID()}`);
    const hasTranscodes = plan.operations.some((op) => op.type === 'transcode');
    if (hasTranscodes && !dryRun) {
      await mkdir(transcodeDir, { recursive: true });
    }

    try {
      for (let index = 0; index < plan.operations.length; index++) {
        const operation = plan.operations[index]!;

        // Check for abort signal
        if (signal?.aborted) {
          throw new Error('Sync aborted');
        }

        // Determine phase based on operation type
        const phase = getPhaseForOperation(operation);

        // Emit preparing progress
        yield {
          phase: 'preparing',
          operation,
          index,
          current: index,
          total,
          currentTrack: getOperationDisplayName(operation),
          bytesProcessed,
          bytesTotal: totalBytes,
        };

        try {
          if (dryRun) {
            // Dry-run: simulate the operation
            yield {
              phase,
              operation,
              index,
              current: index,
              total,
              currentTrack: getOperationDisplayName(operation),
              bytesProcessed,
              bytesTotal: totalBytes,
              skipped: true,
            };
            _skipped++;
          } else {
            // Execute the actual operation
            const result = await this.executeOperation(
              operation,
              transcodeDir,
              signal
            );

            bytesProcessed += result.bytesTransferred;
            completed++;

            yield {
              phase,
              operation,
              index,
              current: index,
              total,
              currentTrack: getOperationDisplayName(operation),
              bytesProcessed,
              bytesTotal: totalBytes,
            };
          }
        } catch (error) {
          failed++;
          const err = error instanceof Error ? error : new Error(String(error));

          yield {
            phase,
            operation,
            index,
            current: index,
            total,
            currentTrack: getOperationDisplayName(operation),
            bytesProcessed,
            bytesTotal: totalBytes,
            error: err,
          };

          if (!continueOnError) {
            throw err;
          }
        }
      }

      // Save database after all operations (unless dry-run)
      if (!dryRun && (completed > 0 || failed > 0)) {
        yield {
          phase: 'updating-db',
          operation: plan.operations[plan.operations.length - 1]!,
          index: plan.operations.length - 1,
          current: plan.operations.length - 1,
          total,
          currentTrack: 'Saving iPod database',
          bytesProcessed,
          bytesTotal: totalBytes,
        };

        await this.database.save();
      }

      // Emit completion
      yield {
        phase: 'complete',
        operation: plan.operations[plan.operations.length - 1]!,
        index: plan.operations.length - 1,
        current: plan.operations.length - 1,
        total,
        bytesProcessed,
        bytesTotal: totalBytes,
      };
    } finally {
      // Cleanup temp directory
      if (hasTranscodes && !dryRun) {
        try {
          await rm(transcodeDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Execute a single sync operation
   */
  private async executeOperation(
    operation: SyncOperation,
    transcodeDir: string,
    signal?: AbortSignal
  ): Promise<{ bytesTransferred: number; track?: Track }> {
    switch (operation.type) {
      case 'transcode':
        return this.executeTranscode(operation, transcodeDir, signal);
      case 'copy':
        return this.executeCopy(operation);
      case 'remove':
        return this.executeRemove(operation);
      case 'update-metadata':
        // TODO: Implement metadata updates
        return { bytesTransferred: 0 };
    }
  }

  /**
   * Execute a transcode operation
   */
  private async executeTranscode(
    operation: Extract<SyncOperation, { type: 'transcode' }>,
    transcodeDir: string,
    signal?: AbortSignal
  ): Promise<{ bytesTransferred: number; track: Track }> {
    const { source, preset: presetRef } = operation;
    const preset = getPreset(presetRef);

    // Generate output path in temp directory
    const baseName = basename(source.filePath, extname(source.filePath));
    const outputPath = join(transcodeDir, `${baseName}-${randomUUID()}.m4a`);

    // Transcode the file
    const result = await this.transcoder.transcode(
      source.filePath,
      outputPath,
      preset,
      { signal }
    );

    // Add track to iPod database
    const trackInput = toTrackInput(source);
    trackInput.bitrate = result.bitrate;
    trackInput.filetype = 'AAC audio file';

    const track = this.database.addTrack(trackInput);

    // Copy transcoded file to iPod
    this.database.copyTrackToDevice(track.id, outputPath);

    return { bytesTransferred: result.size, track };
  }

  /**
   * Execute a copy operation
   */
  private async executeCopy(
    operation: Extract<SyncOperation, { type: 'copy' }>
  ): Promise<{ bytesTransferred: number; track: Track }> {
    const { source } = operation;

    // Add track to iPod database
    const trackInput = toTrackInput(source);

    // Set filetype based on extension
    const ext = extname(source.filePath).toLowerCase();
    switch (ext) {
      case '.mp3':
        trackInput.filetype = 'MPEG audio file';
        break;
      case '.m4a':
      case '.aac':
        trackInput.filetype = 'AAC audio file';
        break;
      case '.alac':
        trackInput.filetype = 'Apple Lossless audio file';
        break;
      default:
        trackInput.filetype = 'Audio file';
    }

    const track = this.database.addTrack(trackInput);

    // Copy source file to iPod
    this.database.copyTrackToDevice(track.id, source.filePath);

    // Estimate bytes transferred (we don't have actual file size)
    const bytesTransferred = source.duration
      ? Math.round((source.duration / 1000) * 32000) // ~256 kbps estimate
      : 5000000; // default 5MB

    return { bytesTransferred, track };
  }

  /**
   * Execute a remove operation
   */
  private async executeRemove(
    operation: Extract<SyncOperation, { type: 'remove' }>
  ): Promise<{ bytesTransferred: number }> {
    const { track } = operation;

    // Remove track from database
    this.database.removeTrack(track.id);

    return { bytesTransferred: 0 };
  }
}

/**
 * Get the phase name for an operation type
 */
function getPhaseForOperation(
  operation: SyncOperation
): SyncProgress['phase'] {
  switch (operation.type) {
    case 'transcode':
      return 'transcoding';
    case 'copy':
      return 'copying';
    case 'remove':
      return 'removing';
    case 'update-metadata':
      return 'updating-db';
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new sync executor
 */
export function createExecutor(deps: ExecutorDependencies): SyncExecutor {
  return new DefaultSyncExecutor(deps);
}

/**
 * Execute a sync plan with simplified interface
 *
 * This is a convenience function that collects all progress events
 * and returns a final result.
 */
export async function executePlan(
  plan: SyncPlan,
  deps: ExecutorDependencies,
  options: ExtendedExecuteOptions = {}
): Promise<ExecuteResult> {
  const executor = new DefaultSyncExecutor(deps);

  let completed = 0;
  let failed = 0;
  let skipped = 0;
  let bytesTransferred = 0;
  const errors: Array<{ operation: SyncOperation; error: Error }> = [];

  for await (const progress of executor.execute(plan, options)) {
    if (progress.phase === 'complete') {
      // Final progress
    } else if (progress.error) {
      failed++;
      errors.push({ operation: progress.operation, error: progress.error });
    } else if (progress.skipped) {
      skipped++;
    } else if (
      progress.phase !== 'preparing' &&
      progress.phase !== 'updating-db'
    ) {
      completed++;
    }

    bytesTransferred = progress.bytesProcessed;
  }

  return {
    completed,
    failed,
    skipped,
    errors,
    bytesTransferred,
  };
}
