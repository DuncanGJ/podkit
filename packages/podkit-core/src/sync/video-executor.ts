/**
 * Video sync executor - executes video sync plans
 *
 * This module implements video sync execution including:
 * - Video transcoding to iPod-compatible format
 * - File transfer to iPod
 * - Adding video tracks to iPod database
 *
 * ## Execution Pipeline
 *
 * Video transcoding follows a sequential approach (videos are large):
 * - Transcode video to temp file
 * - Transfer file to iPod
 * - Add track to database
 *
 * ## Progress Reporting
 *
 * Progress is reported at two granularities:
 * - Per-file: overall operation progress
 * - Per-transcode: transcoding percentage for long videos
 *
 * @module
 */

import type { SyncOperation, ExecuteOptions, SyncPlan, ExecutorProgress } from './types.js';
import type { TranscodeProgress } from '../transcode/types.js';
import type { IpodDatabase } from '../ipod/index.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map an operation type to its corresponding progress phase
 */
function getPhaseForOperationType(type: SyncOperation['type']): ExecutorProgress['phase'] {
  switch (type) {
    case 'video-transcode':
      return 'video-transcoding';
    case 'video-copy':
      return 'video-copying';
    case 'video-remove':
      return 'removing';
    case 'video-update-metadata':
      return 'video-updating-metadata';
    case 'video-upgrade':
      return 'video-upgrading';
    default:
      return 'preparing';
  }
}

// =============================================================================
// Types
// =============================================================================

/**
 * Extended options for video sync execution
 */
export interface VideoExecuteOptions extends ExecuteOptions {
  /** Continue executing remaining operations after an error */
  continueOnError?: boolean;

  /** Temporary directory for transcoded files (defaults to system temp) */
  tempDir?: string;

  /** Callback for transcode progress updates (within a single video) */
  onTranscodeProgress?: (progress: TranscodeProgress) => void;

  /**
   * Video quality preset name for sync tag writing.
   * When set, sync tags are written to transcoded video tracks.
   */
  videoQuality?: string;

  /**
   * Save the iPod database every N completed video operations (transcode + copy).
   *
   * Reduces data loss if the process is killed, at the cost of triggering
   * libgpod's ithmb compaction more frequently. Set to 0 to disable.
   *
   * @default 10
   */
  saveInterval?: number;
}

/**
 * Dependencies required for video executor
 */
export interface VideoExecutorDependencies {
  /** iPod database instance */
  ipod: IpodDatabase;
}

// =============================================================================
// Interface
// =============================================================================

/**
 * Interface for executing video sync plans
 */
export interface VideoSyncExecutor {
  /**
   * Execute a video sync plan
   *
   * Yields progress updates during execution. Each yield represents
   * either an operation starting, completing, or failing.
   *
   * @param plan - The video sync plan to execute
   * @param options - Execution options
   * @yields Progress updates during execution
   *
   * @example
   * ```typescript
   * const executor = createVideoExecutor({ ipod });
   * const plan = planVideoSync(diff);
   *
   * for await (const progress of executor.execute(plan)) {
   *   console.log(`${progress.phase}: ${progress.currentTrack}`);
   *   if (progress.transcodeProgress) {
   *     console.log(`  Transcoding: ${progress.transcodeProgress.percent.toFixed(1)}%`);
   *   }
   * }
   * ```
   */
  execute(plan: SyncPlan, options?: VideoExecuteOptions): AsyncIterable<ExecutorProgress>;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Placeholder video sync executor (dry-run only, no dependencies)
 *
 * Use this when you don't have an iPod connection but want to preview plans.
 */
export class PlaceholderVideoSyncExecutor implements VideoSyncExecutor {
  /**
   * Execute a video sync plan (dry-run only)
   */
  async *execute(
    plan: SyncPlan,
    options: VideoExecuteOptions = {}
  ): AsyncIterable<ExecutorProgress> {
    const { dryRun = false } = options;

    if (!dryRun) {
      throw new Error(
        'PlaceholderVideoSyncExecutor only supports dry-run mode. ' +
          'Use createVideoExecutor({ ipod }) for real execution.'
      );
    }

    const total = plan.operations.length;
    const bytesProcessed = 0;

    for (let index = 0; index < plan.operations.length; index++) {
      const operation = plan.operations[index]!;

      const phase = getPhaseForOperationType(operation.type);

      yield {
        phase,
        operation,
        index,
        current: index,
        total,
        currentTrack: getVideoOperationDisplayName(operation),
        bytesProcessed,
        bytesTotal: plan.estimatedSize,
        skipped: true,
      };
    }

    // Emit completion
    if (plan.operations.length > 0) {
      yield {
        phase: 'complete',
        operation: plan.operations[plan.operations.length - 1]!,
        index: plan.operations.length - 1,
        current: plan.operations.length - 1,
        total,
        currentTrack: getVideoOperationDisplayName(plan.operations[plan.operations.length - 1]!),
        bytesProcessed,
        bytesTotal: plan.estimatedSize,
      };
    }
  }
}

/**
 * Get display name for a video operation
 */
export function getVideoOperationDisplayName(operation: SyncOperation): string {
  switch (operation.type) {
    case 'video-transcode':
    case 'video-copy': {
      const video = operation.source;
      if (video.contentType === 'tvshow' && video.episodeId) {
        // Format: "Series Title - S01E01" or "Title - S01E01" if no series title
        const showName = video.seriesTitle || video.title;
        return `${showName} - ${video.episodeId}`;
      }
      // For movies, just use the title (with year if available)
      if (video.year) {
        return `${video.title} (${video.year})`;
      }
      return video.title;
    }
    case 'video-upgrade': {
      const video = operation.source;
      if (video.contentType === 'tvshow' && video.episodeId) {
        const showName = video.seriesTitle || video.title;
        return `${showName} - ${video.episodeId}`;
      }
      if (video.year) {
        return `${video.title} (${video.year})`;
      }
      return video.title;
    }
    case 'video-remove': {
      const video = operation.video;
      if (
        video.contentType === 'tvshow' &&
        video.seasonNumber !== undefined &&
        video.episodeNumber !== undefined
      ) {
        const showName = video.seriesTitle || video.title;
        const episodeId = `S${String(video.seasonNumber).padStart(2, '0')}E${String(video.episodeNumber).padStart(2, '0')}`;
        return `${showName} - ${episodeId}`;
      }
      return video.title;
    }
    case 'video-update-metadata': {
      const video = operation.video;
      if (
        video.contentType === 'tvshow' &&
        video.seasonNumber !== undefined &&
        video.episodeNumber !== undefined
      ) {
        const showName = video.seriesTitle || video.title;
        const episodeId = `S${String(video.seasonNumber).padStart(2, '0')}E${String(video.episodeNumber).padStart(2, '0')}`;
        return `${showName} - ${episodeId}`;
      }
      return video.title;
    }
    default:
      return 'Unknown operation';
  }
}

/**
 * Create a video sync executor
 *
 * @param deps - Dependencies including iPod database instance
 * @returns A video sync executor that can execute plans
 *
 * @example
 * ```typescript
 * const ipod = await IpodDatabase.open('/Volumes/iPod');
 * const executor = createVideoExecutor({ ipod });
 *
 * for await (const progress of executor.execute(plan)) {
 *   console.log(`${progress.phase}: ${progress.currentTrack}`);
 * }
 *
 * ipod.save();
 * ipod.close();
 * ```
 */
export function createVideoExecutor(_deps?: VideoExecutorDependencies): VideoSyncExecutor {
  // Video execution uses UnifiedExecutor + VideoHandler.
  // This factory returns the placeholder (dry-run only) executor.
  return new PlaceholderVideoSyncExecutor();
}
