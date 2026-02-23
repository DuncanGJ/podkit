/**
 * Sync planner for converting diffs into execution plans
 *
 * The planner takes a SyncDiff (from the diff engine) and produces a SyncPlan
 * containing ordered operations. It determines whether each track needs
 * transcoding or can be copied directly, estimates output sizes, and checks
 * available space on the iPod.
 *
 * ## Planning Logic
 *
 * 1. For each track in `toAdd`:
 *    - Check if format is iPod-compatible (MP3, AAC/M4A, ALAC)
 *    - If compatible: operation = 'copy'
 *    - If needs conversion (FLAC, OGG, OPUS, WAV): operation = 'transcode'
 *    - Estimate output size based on duration and target bitrate
 *
 * 2. For each track in `toRemove`:
 *    - If removeOrphans is enabled: operation = 'remove'
 *
 * 3. Calculate total required space and validate against available space
 *
 * @module
 */

import type { CollectionTrack } from '../adapters/interface.js';
import type { AudioFileType } from '../types.js';
import { PRESETS, type TranscodePreset } from '../transcode/types.js';
import type {
  IPodTrack,
  PlanOptions,
  SyncDiff,
  SyncOperation,
  SyncPlan,
  SyncPlanner,
  TranscodePresetRef,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Audio formats that are natively compatible with iPod (no transcoding needed)
 *
 * - mp3: MPEG Audio Layer 3 - universally supported
 * - m4a: AAC in MP4 container - native iTunes format
 * - aac: Raw AAC - supported but less common
 * - alac: Apple Lossless - supported on newer iPods
 */
const IPOD_COMPATIBLE_FORMATS: Set<AudioFileType> = new Set([
  'mp3',
  'm4a',
  'aac',
  'alac',
]);

/**
 * Formats that require transcoding to iPod-compatible format
 *
 * - flac: Free Lossless Audio Codec - needs transcoding
 * - ogg: Ogg Vorbis - needs transcoding
 * - opus: Opus codec - needs transcoding
 * - wav: Uncompressed PCM - needs transcoding (and would waste space)
 */
const TRANSCODE_REQUIRED_FORMATS: Set<AudioFileType> = new Set([
  'flac',
  'ogg',
  'opus',
  'wav',
]);

/**
 * Default transcode preset if none specified
 */
const DEFAULT_PRESET: TranscodePresetRef = { name: 'high' };

/**
 * Average overhead for M4A container (headers, atoms, etc.)
 * This is added to the calculated audio data size
 */
const M4A_CONTAINER_OVERHEAD_BYTES = 2048;

/**
 * Estimated transcoding speed (duration processed per second)
 * Used for time estimation. Conservative estimate for older hardware.
 */
const TRANSCODE_SPEED_RATIO = 10; // 10x realtime

/**
 * Estimated copy speed in bytes per second
 * Conservative estimate for USB 2.0 iPod transfer
 */
const COPY_SPEED_BYTES_PER_SEC = 5 * 1024 * 1024; // 5 MB/s

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an audio format is iPod-compatible (can be copied directly)
 */
export function isIPodCompatible(fileType: AudioFileType): boolean {
  return IPOD_COMPATIBLE_FORMATS.has(fileType);
}

/**
 * Check if an audio format requires transcoding
 */
export function requiresTranscoding(fileType: AudioFileType): boolean {
  return TRANSCODE_REQUIRED_FORMATS.has(fileType);
}

/**
 * Get the transcode preset configuration from a preset reference
 */
function getPresetConfig(ref: TranscodePresetRef): TranscodePreset {
  if (ref.name === 'custom') {
    // For custom presets, use medium as fallback for size estimation
    return PRESETS.medium;
  }
  return PRESETS[ref.name];
}

/**
 * Estimate output file size for a transcoded track
 *
 * Formula: (duration_ms / 1000) * (bitrate_kbps / 8) * 1000 + overhead
 *        = (duration_ms * bitrate_kbps) / 8 + overhead
 *
 * @param durationMs - Track duration in milliseconds
 * @param bitrateKbps - Target bitrate in kilobits per second
 * @returns Estimated file size in bytes
 */
export function estimateTranscodedSize(
  durationMs: number,
  bitrateKbps: number
): number {
  // Convert: duration(ms) * bitrate(kbps) / 8 = bytes
  // duration_ms / 1000 = seconds
  // bitrate_kbps * 1000 / 8 = bytes per second
  const audioBytes = (durationMs / 1000) * (bitrateKbps * 1000 / 8);
  return Math.ceil(audioBytes + M4A_CONTAINER_OVERHEAD_BYTES);
}

/**
 * Estimate size for a track that will be copied directly
 *
 * For compatible formats, we need to estimate based on existing bitrate
 * if available, or use duration with assumed bitrate.
 *
 * @param track - The collection track to estimate
 * @returns Estimated file size in bytes
 */
export function estimateCopySize(track: CollectionTrack): number {
  // If duration is available, estimate based on typical bitrate for format
  if (track.duration && track.duration > 0) {
    // Assume typical bitrates for different formats
    let typicalBitrateKbps: number;
    switch (track.fileType) {
      case 'mp3':
        typicalBitrateKbps = 256;
        break;
      case 'm4a':
      case 'aac':
        typicalBitrateKbps = 256;
        break;
      case 'alac':
        // ALAC is lossless, typically ~800-1000 kbps for CD quality
        typicalBitrateKbps = 900;
        break;
      default:
        typicalBitrateKbps = 256;
    }
    return estimateTranscodedSize(track.duration, typicalBitrateKbps);
  }

  // Fallback: assume 4 minutes at 256 kbps
  return estimateTranscodedSize(240000, 256);
}

/**
 * Estimate time to transcode a track
 *
 * @param durationMs - Track duration in milliseconds
 * @returns Estimated transcode time in seconds
 */
function estimateTranscodeTime(durationMs: number): number {
  // Transcode at TRANSCODE_SPEED_RATIO times realtime
  return (durationMs / 1000) / TRANSCODE_SPEED_RATIO;
}

/**
 * Estimate time to copy a file
 *
 * @param sizeBytes - File size in bytes
 * @returns Estimated copy time in seconds
 */
function estimateCopyTime(sizeBytes: number): number {
  return sizeBytes / COPY_SPEED_BYTES_PER_SEC;
}

// =============================================================================
// Planning Functions
// =============================================================================

/**
 * Create a transcode operation for a track
 */
function createTranscodeOperation(
  track: CollectionTrack,
  preset: TranscodePresetRef
): SyncOperation {
  return {
    type: 'transcode',
    source: track,
    preset,
  };
}

/**
 * Create a copy operation for a track
 */
function createCopyOperation(track: CollectionTrack): SyncOperation {
  return {
    type: 'copy',
    source: track,
  };
}

/**
 * Create a remove operation for an iPod track
 */
function createRemoveOperation(track: IPodTrack): SyncOperation {
  return {
    type: 'remove',
    track,
  };
}

/**
 * Plan operations for tracks to be added
 */
function planAddOperations(
  tracks: CollectionTrack[],
  preset: TranscodePresetRef
): SyncOperation[] {
  return tracks.map((track) => {
    if (isIPodCompatible(track.fileType)) {
      return createCopyOperation(track);
    } else {
      return createTranscodeOperation(track, preset);
    }
  });
}

/**
 * Plan operations for tracks to be removed
 */
function planRemoveOperations(
  tracks: IPodTrack[],
  removeOrphans: boolean
): SyncOperation[] {
  if (!removeOrphans) {
    return [];
  }
  return tracks.map((track) => createRemoveOperation(track));
}

/**
 * Calculate estimated size for an operation
 */
export function calculateOperationSize(
  operation: SyncOperation
): number {
  switch (operation.type) {
    case 'transcode': {
      const preset = getPresetConfig(operation.preset);
      const duration = operation.source.duration ?? 240000; // default 4 min
      const bitrate = preset.bitrate ?? 192;
      return estimateTranscodedSize(duration, bitrate);
    }
    case 'copy': {
      return estimateCopySize(operation.source);
    }
    case 'remove':
    case 'update-metadata':
      // These operations free space rather than consume it
      return 0;
  }
}

/**
 * Calculate estimated time for an operation
 */
function calculateOperationTime(operation: SyncOperation): number {
  switch (operation.type) {
    case 'transcode': {
      const duration = operation.source.duration ?? 240000;
      return estimateTranscodeTime(duration);
    }
    case 'copy': {
      const size = estimateCopySize(operation.source);
      return estimateCopyTime(size);
    }
    case 'remove':
      // Removal is nearly instant (database update)
      return 0.1;
    case 'update-metadata':
      // Metadata update is instant
      return 0.01;
  }
}

/**
 * Order operations for efficient execution
 *
 * Strategy:
 * 1. Remove operations first (free up space)
 * 2. Copy operations next (faster, no CPU intensive)
 * 3. Transcode operations last (CPU intensive, can parallelize)
 */
function orderOperations(operations: SyncOperation[]): SyncOperation[] {
  const removes: SyncOperation[] = [];
  const copies: SyncOperation[] = [];
  const transcodes: SyncOperation[] = [];
  const updates: SyncOperation[] = [];

  for (const op of operations) {
    switch (op.type) {
      case 'remove':
        removes.push(op);
        break;
      case 'copy':
        copies.push(op);
        break;
      case 'transcode':
        transcodes.push(op);
        break;
      case 'update-metadata':
        updates.push(op);
        break;
    }
  }

  return [...removes, ...copies, ...transcodes, ...updates];
}

// =============================================================================
// Main Planning Logic
// =============================================================================

/**
 * Create a sync plan from a diff
 *
 * This function analyzes the diff and produces an ordered list of operations
 * to execute, along with estimated time and size requirements.
 *
 * @param diff - The diff from the diff engine
 * @param options - Planning options
 * @returns The sync plan with operations, estimated time, and size
 *
 * @example
 * const diff = computeDiff(collectionTracks, ipodTracks);
 * const plan = createPlan(diff, { removeOrphans: true });
 * console.log(`${plan.operations.length} operations to execute`);
 * console.log(`Estimated size: ${plan.estimatedSize} bytes`);
 */
export function createPlan(
  diff: SyncDiff,
  options: PlanOptions = {}
): SyncPlan {
  const {
    removeOrphans = false,
    transcodePreset = DEFAULT_PRESET,
  } = options;

  // Plan add operations (copy or transcode)
  const addOperations = planAddOperations(diff.toAdd, transcodePreset);

  // Plan remove operations (if enabled)
  const removeOperations = planRemoveOperations(diff.toRemove, removeOrphans);

  // Combine and order operations
  const allOperations = [...addOperations, ...removeOperations];
  const orderedOperations = orderOperations(allOperations);

  // Calculate totals
  let estimatedSize = 0;
  let estimatedTime = 0;

  for (const op of orderedOperations) {
    estimatedSize += calculateOperationSize(op);
    estimatedTime += calculateOperationTime(op);
  }

  return {
    operations: orderedOperations,
    estimatedTime,
    estimatedSize,
  };
}

/**
 * Check if a plan will fit within available space
 *
 * @param plan - The sync plan to check
 * @param availableSpace - Available space in bytes
 * @returns true if plan fits, false otherwise
 */
export function willFitInSpace(
  plan: SyncPlan,
  availableSpace: number
): boolean {
  return plan.estimatedSize <= availableSpace;
}

/**
 * Get a summary of operations in a plan
 */
export function getPlanSummary(plan: SyncPlan): {
  transcodeCount: number;
  copyCount: number;
  removeCount: number;
  updateCount: number;
} {
  let transcodeCount = 0;
  let copyCount = 0;
  let removeCount = 0;
  let updateCount = 0;

  for (const op of plan.operations) {
    switch (op.type) {
      case 'transcode':
        transcodeCount++;
        break;
      case 'copy':
        copyCount++;
        break;
      case 'remove':
        removeCount++;
        break;
      case 'update-metadata':
        updateCount++;
        break;
    }
  }

  return { transcodeCount, copyCount, removeCount, updateCount };
}

// =============================================================================
// SyncPlanner Implementation
// =============================================================================

/**
 * Default implementation of SyncPlanner interface
 */
export class DefaultSyncPlanner implements SyncPlanner {
  /**
   * Create an execution plan from a diff
   */
  plan(diff: SyncDiff, options?: PlanOptions): SyncPlan {
    return createPlan(diff, options);
  }
}

/**
 * Create a new SyncPlanner instance
 */
export function createPlanner(): SyncPlanner {
  return new DefaultSyncPlanner();
}
