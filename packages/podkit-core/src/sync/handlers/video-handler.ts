/**
 * VideoHandler — ContentTypeHandler implementation for video content
 *
 * Implements video sync operations including transcoding with progress
 * reporting, file copy, removal, metadata updates, and upgrades.
 *
 * @module
 */

import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { mkdir, stat, rm } from '../video-executor-fs.js';

import type { CollectionVideo } from '../../video/directory-adapter.js';
import type { IPodTrack } from '../../ipod/types.js';
import type { IpodDatabase } from '../../ipod/database.js';
import { isVideoMediaType, createVideoTrackInput } from '../../ipod/video.js';
import { transcodeVideo } from '../../video/transcode.js';
import { probeVideo } from '../../video/probe.js';
import { generateVideoMatchKey, type IPodVideo } from '../video-differ.js';
import { calculateVideoOperationSize, calculateVideoOperationTime } from '../video-planner.js';
import { getVideoOperationDisplayName } from '../video-executor.js';
import { buildVideoSyncTag, writeSyncTag } from '../sync-tags.js';
import type { SyncOperation, SyncPlan, UpdateReason, UpgradeReason } from '../types.js';
import type { TranscodeProgress } from '../../transcode/types.js';
import type {
  ContentTypeHandler,
  HandlerDiffOptions,
  HandlerPlanOptions,
  ExecutionContext,
  OperationProgress,
  DryRunSummary,
} from '../content-type.js';

// =============================================================================
// VideoHandler Implementation
// =============================================================================

/**
 * ContentTypeHandler implementation for video content.
 *
 * Delegates to existing video sync functions from video-differ.ts,
 * video-planner.ts, and video-executor.ts.
 */
export class VideoHandler implements ContentTypeHandler<CollectionVideo, IPodVideo> {
  readonly type = 'video';

  // ---- Diffing ----

  generateMatchKey(source: CollectionVideo): string {
    return generateVideoMatchKey(source);
  }

  generateDeviceMatchKey(device: IPodVideo): string {
    return generateVideoMatchKey(device);
  }

  applyTransformKey(source: CollectionVideo): string {
    // For video, transforms affect series title — generate key with original metadata
    // (the actual transform application uses getVideoTransformMatchKeys in the differ)
    return generateVideoMatchKey(source);
  }

  getDeviceItemId(device: IPodVideo): string {
    return device.id;
  }

  detectUpdates(
    source: CollectionVideo,
    device: IPodVideo,
    _options: HandlerDiffOptions
  ): UpdateReason[] {
    const reasons: UpdateReason[] = [];

    // Detect numeric metadata corrections (same logic as video-differ.ts)
    const hasMetadataCorrection =
      (source.seasonNumber !== undefined &&
        device.seasonNumber !== undefined &&
        source.seasonNumber !== device.seasonNumber) ||
      (source.episodeNumber !== undefined &&
        device.episodeNumber !== undefined &&
        source.episodeNumber !== device.episodeNumber) ||
      (source.year !== undefined && device.year !== undefined && source.year !== device.year);

    if (hasMetadataCorrection) {
      reasons.push('metadata-correction');
    }

    // Preset change detection is handled by the differ via sync tags,
    // not by detectUpdates. This method covers metadata-level changes.

    return reasons;
  }

  // ---- Planning ----

  planAdd(source: CollectionVideo, _options: HandlerPlanOptions): SyncOperation {
    // Default to video-transcode; the actual planner determines passthrough vs transcode
    // based on compatibility checking. This stub provides a reasonable default.
    return {
      type: 'video-transcode',
      source,
      settings: {
        targetVideoBitrate: 1500,
        targetAudioBitrate: 128,
        targetWidth: 640,
        targetHeight: 480,
        videoProfile: 'baseline',
        videoLevel: '3.0',
        crf: 23,
        frameRate: 30,
        useHardwareAcceleration: _options.hardwareAcceleration ?? true,
      },
    };
  }

  planRemove(device: IPodVideo): SyncOperation {
    return { type: 'video-remove', video: device };
  }

  planUpdate(source: CollectionVideo, device: IPodVideo, reasons: UpdateReason[]): SyncOperation[] {
    if (reasons.length === 0) return [];

    const primaryReason = reasons[0]!;

    // Preset changes require re-transcoding via upgrade
    if (primaryReason === 'preset-upgrade' || primaryReason === 'preset-downgrade') {
      return [
        {
          type: 'video-upgrade',
          source,
          target: device,
          reason: primaryReason as UpgradeReason,
        },
      ];
    }

    // Metadata-only updates
    return [
      {
        type: 'video-update-metadata',
        source,
        video: device,
      },
    ];
  }

  estimateSize(op: SyncOperation): number {
    if (
      op.type === 'video-transcode' ||
      op.type === 'video-copy' ||
      op.type === 'video-remove' ||
      op.type === 'video-update-metadata' ||
      op.type === 'video-upgrade'
    ) {
      return calculateVideoOperationSize(op);
    }
    return 0;
  }

  estimateTime(op: SyncOperation): number {
    if (
      op.type === 'video-transcode' ||
      op.type === 'video-copy' ||
      op.type === 'video-remove' ||
      op.type === 'video-update-metadata' ||
      op.type === 'video-upgrade'
    ) {
      return calculateVideoOperationTime(op);
    }
    return 0;
  }

  // ---- Execution ----

  /** Video quality preset for sync tag writing (set via setVideoQuality) */
  private videoQuality?: string;

  /**
   * Set the video quality preset name for sync tag writing.
   * When set, sync tags are written to transcoded video tracks.
   */
  setVideoQuality(quality: string | undefined): void {
    this.videoQuality = quality;
  }

  async *execute(op: SyncOperation, ctx: ExecutionContext): AsyncGenerator<OperationProgress> {
    switch (op.type) {
      case 'video-transcode':
        yield* this.executeTranscode(op, ctx);
        break;
      case 'video-copy':
        yield* this.executeCopy(op, ctx);
        break;
      case 'video-remove':
        yield* this.executeRemove(op, ctx);
        break;
      case 'video-update-metadata':
        yield* this.executeUpdateMetadata(op, ctx);
        break;
      case 'video-upgrade':
        yield* this.executeUpgrade(op, ctx);
        break;
      default:
        yield { operation: op, phase: 'starting' };
        yield { operation: op, phase: 'complete' };
    }
  }

  async *executeBatch(
    operations: SyncOperation[],
    ctx: ExecutionContext
  ): AsyncGenerator<OperationProgress> {
    // Create a shared temp directory for all transcodes in this batch
    const tempDir = ctx.tempDir ?? tmpdir();
    const transcodeDir = join(tempDir, `podkit-video-${randomUUID()}`);
    const hasTranscodes = operations.some(
      (op) => op.type === 'video-transcode' || (op.type === 'video-upgrade' && op.settings)
    );

    if (hasTranscodes && !ctx.dryRun) {
      await mkdir(transcodeDir, { recursive: true });
    }

    try {
      for (const op of operations) {
        // Use a context with the shared transcode dir
        const batchCtx: ExecutionContext = { ...ctx, tempDir: transcodeDir };
        yield* this.execute(op, batchCtx);
      }
    } finally {
      if (hasTranscodes && !ctx.dryRun) {
        try {
          await rm(transcodeDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  // ---- Private execution helpers ----

  /**
   * Execute a video transcode operation with progress reporting.
   *
   * Uses an async queue pattern to bridge the onProgress callback
   * from transcodeVideo() into the async generator yield pattern.
   */
  private async *executeTranscode(
    op: Extract<SyncOperation, { type: 'video-transcode' }>,
    ctx: ExecutionContext
  ): AsyncGenerator<OperationProgress> {
    const { source, settings } = op;

    yield { operation: op, phase: 'starting' };

    // Set up temp directory for output
    const tempDir = ctx.tempDir ?? tmpdir();
    const outputFilename = `${randomUUID()}.m4v`;
    const tempOutputPath = join(tempDir, outputFilename);

    // Async queue for bridging onProgress callback → yield
    const progressQueue: Array<{ percent: number; speed?: string }> = [];
    let resolveWaiter: (() => void) | null = null;
    let transcodeComplete = false;
    let transcodeError: Error | undefined;

    const transcodePromise = transcodeVideo(source.filePath, tempOutputPath, settings, {
      signal: ctx.signal,
      onProgress: (p: TranscodeProgress) => {
        progressQueue.push({
          percent: p.percent,
          speed: p.speed !== undefined ? String(p.speed) : undefined,
        });
        resolveWaiter?.();
      },
    });

    transcodePromise
      .then(() => {
        transcodeComplete = true;
        resolveWaiter?.();
      })
      .catch((err) => {
        transcodeError = err instanceof Error ? err : new Error(String(err));
        transcodeComplete = true;
        resolveWaiter?.();
      });

    // Yield progress events as they arrive
    while (!transcodeComplete) {
      if (progressQueue.length === 0) {
        await new Promise<void>((r) => {
          resolveWaiter = r;
        });
      }
      while (progressQueue.length > 0) {
        const p = progressQueue.shift()!;
        yield {
          operation: op,
          phase: 'in-progress',
          progress: p.percent / 100,
          transcodeProgress: { percent: p.percent, speed: p.speed },
        };
      }
    }

    // Check for errors
    if (transcodeError) {
      throw transcodeError;
    }

    // Ensure promise is fully resolved
    await transcodePromise;

    // Get transcoded file size and probe for metadata
    const outputStats = await stat(tempOutputPath);
    const analysis = await probeVideo(source.filePath);
    const outputAnalysis = await probeVideo(tempOutputPath);

    // Create track input for iPod database
    const trackInput = createVideoTrackInput(source, analysis, {
      size: outputStats.size,
      bitrate: outputAnalysis.videoBitrate + outputAnalysis.audioBitrate,
    });

    // Apply transformed series title if set
    if (op.transformedSeriesTitle) {
      trackInput.artist = op.transformedSeriesTitle;
      trackInput.tvShow = op.transformedSeriesTitle;
      if (trackInput.album && source.contentType === 'tvshow') {
        trackInput.album = `${op.transformedSeriesTitle}, Season ${source.seasonNumber ?? 1}`;
      }
    }

    // Write sync tag if quality preset is configured
    if (this.videoQuality) {
      const syncTag = buildVideoSyncTag(this.videoQuality);
      trackInput.comment = writeSyncTag(trackInput.comment, syncTag);
    }

    // Add track to iPod and copy file
    const track = ctx.ipod.addTrack(trackInput);
    track.copyFile(tempOutputPath);

    yield { operation: op, phase: 'complete' };
  }

  /**
   * Execute a video copy (passthrough) operation.
   */
  private async *executeCopy(
    op: Extract<SyncOperation, { type: 'video-copy' }>,
    ctx: ExecutionContext
  ): AsyncGenerator<OperationProgress> {
    const { source } = op;

    yield { operation: op, phase: 'starting' };

    // Get file stats and probe metadata
    const fileStats = await stat(source.filePath);
    const analysis = await probeVideo(source.filePath);

    // Create track input
    const trackInput = createVideoTrackInput(source, analysis, {
      size: fileStats.size,
    });

    // Apply transformed series title if set
    if (op.transformedSeriesTitle) {
      trackInput.artist = op.transformedSeriesTitle;
      trackInput.tvShow = op.transformedSeriesTitle;
      if (trackInput.album && source.contentType === 'tvshow') {
        trackInput.album = `${op.transformedSeriesTitle}, Season ${source.seasonNumber ?? 1}`;
      }
    }

    // Add track to iPod and copy file
    const track = ctx.ipod.addTrack(trackInput);
    track.copyFile(source.filePath);

    yield { operation: op, phase: 'complete' };
  }

  /**
   * Execute a video remove operation.
   */
  private async *executeRemove(
    op: Extract<SyncOperation, { type: 'video-remove' }>,
    ctx: ExecutionContext
  ): AsyncGenerator<OperationProgress> {
    const { video } = op;

    yield { operation: op, phase: 'starting' };

    const tracks = ctx.ipod.getTracks();
    const foundTrack = tracks.find(
      (t) =>
        t.filePath === video.filePath || (t.title === video.title && t.tvShow === video.seriesTitle)
    );

    if (!foundTrack) {
      throw new Error(`Video track not found in database: ${video.title}`);
    }

    foundTrack.remove();

    yield { operation: op, phase: 'complete' };
  }

  /**
   * Execute a video metadata update operation.
   */
  private async *executeUpdateMetadata(
    op: Extract<SyncOperation, { type: 'video-update-metadata' }>,
    ctx: ExecutionContext
  ): AsyncGenerator<OperationProgress> {
    const { video, source, newSeriesTitle } = op;

    yield { operation: op, phase: 'starting' };

    const tracks = ctx.ipod.getTracks();
    const foundTrack = tracks.find(
      (t) =>
        t.filePath === video.filePath || (t.title === video.title && t.tvShow === video.seriesTitle)
    );

    if (!foundTrack) {
      throw new Error(`Video track not found in database: ${video.title}`);
    }

    if (source.contentType === 'tvshow') {
      const seriesTitle = newSeriesTitle ?? source.seriesTitle ?? source.title;
      const episodeTitle = source.title || formatVideoEpisodeTitle(source);

      foundTrack.update({
        title: episodeTitle,
        artist: seriesTitle,
        album: `${seriesTitle}, Season ${source.seasonNumber ?? 1}`,
        tvShow: seriesTitle,
        tvEpisode: episodeTitle,
        trackNumber: source.episodeNumber,
        discNumber: source.seasonNumber,
      });
    } else if (source.contentType === 'movie') {
      foundTrack.update({
        title: source.title,
        artist: source.director ?? source.studio,
        album: source.title,
      });
    } else if (newSeriesTitle !== undefined) {
      foundTrack.update({
        artist: newSeriesTitle,
        album: `${newSeriesTitle}, Season ${video.seasonNumber ?? 1}`,
        tvShow: newSeriesTitle,
      });
    }

    yield { operation: op, phase: 'complete' };
  }

  /**
   * Execute a video upgrade operation (remove old + transcode/copy new).
   */
  private async *executeUpgrade(
    op: Extract<SyncOperation, { type: 'video-upgrade' }>,
    ctx: ExecutionContext
  ): AsyncGenerator<OperationProgress> {
    const { source, target, settings } = op;

    yield { operation: op, phase: 'starting' };

    // Step 1: Remove the old iPod track
    const tracks = ctx.ipod.getTracks();
    const foundTrack = tracks.find(
      (t) =>
        t.filePath === target.filePath ||
        (t.title === target.title && t.tvShow === target.seriesTitle)
    );

    if (foundTrack) {
      foundTrack.remove();
    }

    // Step 2: Transcode or copy the new source
    if (settings) {
      // Needs transcoding — delegate to executeTranscode
      const transcodeOp: Extract<SyncOperation, { type: 'video-transcode' }> = {
        type: 'video-transcode',
        source,
        settings,
      };

      for await (const progress of this.executeTranscode(transcodeOp, ctx)) {
        // Re-tag progress events with the upgrade operation
        yield { ...progress, operation: op };
      }
    } else {
      // Passthrough copy
      const copyOp: Extract<SyncOperation, { type: 'video-copy' }> = {
        type: 'video-copy',
        source,
      };

      for await (const progress of this.executeCopy(copyOp, ctx)) {
        yield { ...progress, operation: op };
      }
    }
  }

  // ---- Device ----

  getDeviceItems(ipod: IpodDatabase): IPodVideo[] {
    const tracks = ipod.getTracks().filter((track) => isVideoMediaType(track.mediaType));

    // Map IPodTrack to IPodVideo for video-specific operations
    return tracks.map((track) => ipodTrackToVideo(track));
  }

  // ---- Display ----

  getDisplayName(op: SyncOperation): string {
    return getVideoOperationDisplayName(op);
  }

  formatDryRun(plan: SyncPlan): DryRunSummary {
    const operationCounts: Record<string, number> = {};
    const operations: DryRunSummary['operations'] = [];
    let toAdd = 0;
    let toRemove = 0;
    let toUpdate = 0;

    for (const op of plan.operations) {
      operationCounts[op.type] = (operationCounts[op.type] ?? 0) + 1;

      if (op.type === 'video-transcode' || op.type === 'video-copy') toAdd++;
      else if (op.type === 'video-remove') toRemove++;
      else if (op.type === 'video-update-metadata' || op.type === 'video-upgrade') toUpdate++;

      operations.push({
        type: op.type,
        displayName: this.getDisplayName(op),
        size: this.estimateSize(op),
      });
    }

    return {
      toAdd,
      toRemove,
      existing: 0, // Not available from plan alone
      toUpdate,
      operationCounts,
      estimatedSize: plan.estimatedSize,
      estimatedTime: plan.estimatedTime,
      warnings: plan.warnings.map((w) => w.message),
      operations,
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format episode title from video metadata
 */
function formatVideoEpisodeTitle(video: CollectionVideo): string {
  if (video.episodeId) {
    return video.episodeId;
  }
  if (video.seasonNumber !== undefined && video.episodeNumber !== undefined) {
    const ep = String(video.episodeNumber).padStart(2, '0');
    const season = String(video.seasonNumber).padStart(2, '0');
    return `S${season}E${ep}`;
  }
  return `Episode ${video.episodeNumber ?? 1}`;
}

/**
 * Convert an IPodTrack (from the database) to an IPodVideo for video operations.
 *
 * Maps the track's metadata fields to the IPodVideo interface used by the
 * video differ and planner.
 */
function ipodTrackToVideo(track: IPodTrack): IPodVideo {
  // Determine content type from media type flags
  const MediaType = { Movie: 0x0002, TVShow: 0x0040 };
  const contentType = (track.mediaType & MediaType.TVShow) !== 0 ? 'tvshow' : 'movie';

  return {
    id: track.filePath, // filePath is unique per track
    filePath: track.filePath,
    contentType: contentType as 'movie' | 'tvshow',
    title: track.title,
    year: track.year,
    seriesTitle: track.tvShow,
    seasonNumber: track.seasonNumber,
    episodeNumber: track.episodeNumber,
    duration: track.duration ? track.duration / 1000 : undefined, // ms to seconds
    bitrate: track.bitrate,
    comment: track.comment,
  };
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a VideoHandler instance
 */
export function createVideoHandler(): VideoHandler {
  return new VideoHandler();
}
