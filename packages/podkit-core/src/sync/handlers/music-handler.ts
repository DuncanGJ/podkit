/**
 * MusicHandler — ContentTypeHandler implementation for music tracks
 *
 * Thin wrapper that delegates to existing music sync functions
 * (matching, differ, planner, executor) via the ContentTypeHandler interface.
 *
 * @module
 */

import type { CollectionTrack } from '../../adapters/interface.js';
import type { IPodTrack } from '../../ipod/types.js';
import type { IpodDatabase } from '../../ipod/database.js';
import { isMusicMediaType } from '../../ipod/constants.js';
import { getMatchKey, getTransformMatchKeys } from '../matching.js';
import { detectUpgrades, isFileReplacementUpgrade } from '../upgrades.js';
import { calculateOperationSize, categorizeSource, isLosslessSource } from '../planner.js';
import { getOperationDisplayName } from '../executor.js';
import { estimateTransferTime } from '../estimation.js';
import type { SyncOperation, SyncPlan, UpdateReason, UpgradeReason } from '../types.js';
import type {
  ContentTypeHandler,
  HandlerDiffOptions,
  HandlerPlanOptions,
  ExecutionContext,
  OperationProgress,
  DryRunSummary,
} from '../content-type.js';

// =============================================================================
// MusicHandler Implementation
// =============================================================================

/**
 * ContentTypeHandler implementation for music tracks.
 *
 * Delegates to existing music sync functions from matching.ts, differ.ts,
 * planner.ts, and executor.ts.
 */
export class MusicHandler implements ContentTypeHandler<CollectionTrack, IPodTrack> {
  readonly type = 'music';

  // ---- Diffing ----

  generateMatchKey(source: CollectionTrack): string {
    return getMatchKey(source);
  }

  generateDeviceMatchKey(device: IPodTrack): string {
    return getMatchKey(device);
  }

  applyTransformKey(source: CollectionTrack): string {
    // getTransformMatchKeys always computes both keys; return the transformed one
    const keys = getTransformMatchKeys(source);
    return keys.transformedKey;
  }

  getDeviceItemId(device: IPodTrack): string {
    // IPodTrack's filePath is unique per track on the iPod
    return device.filePath;
  }

  detectUpdates(
    source: CollectionTrack,
    device: IPodTrack,
    options: HandlerDiffOptions
  ): UpdateReason[] {
    let reasons = detectUpgrades(source, device) as UpdateReason[];

    // When transcoding is active, suppress format-upgrade for lossless→AAC
    if (options.transcodingActive && reasons.includes('format-upgrade')) {
      reasons = reasons.filter((r) => r !== 'format-upgrade');
    }

    // When skipUpgrades is set, filter out file-replacement upgrades
    if (options.skipUpgrades) {
      reasons = reasons.filter((r) => !isFileReplacementUpgrade(r as UpgradeReason));
    }

    // When forceTranscode is on and source is lossless, ensure file-replacement
    if (options.forceTranscode) {
      const category = categorizeSource(source);
      if (
        isLosslessSource(category) &&
        !reasons.some((r) => isFileReplacementUpgrade(r as UpgradeReason))
      ) {
        reasons.unshift('force-transcode');
      }
    }

    return reasons;
  }

  // ---- Planning ----

  planAdd(source: CollectionTrack, options: HandlerPlanOptions): SyncOperation {
    const category = categorizeSource(source);

    if (category === 'compatible-lossy') {
      return { type: 'copy', source };
    }

    // Lossless or incompatible lossy — needs transcoding
    // Determine preset name based on options
    const presetName =
      options.qualityPreset === 'max'
        ? options.deviceSupportsAlac
          ? 'lossless'
          : 'high'
        : ((options.qualityPreset as 'high' | 'medium' | 'low') ?? 'high');

    // ALAC source with lossless preset can be copied directly
    if (presetName === 'lossless' && source.codec?.toLowerCase() === 'alac') {
      return { type: 'copy', source };
    }

    return {
      type: 'transcode',
      source,
      preset: {
        name: presetName as Exclude<typeof presetName, 'max'>,
        ...(options.customBitrate !== undefined && { bitrateOverride: options.customBitrate }),
      },
    };
  }

  planRemove(device: IPodTrack): SyncOperation {
    return { type: 'remove', track: device };
  }

  planUpdate(source: CollectionTrack, device: IPodTrack, reasons: UpdateReason[]): SyncOperation[] {
    if (reasons.length === 0) return [];

    const primaryReason = reasons[0]!;

    // File-replacement upgrades
    if (isFileReplacementUpgrade(primaryReason as UpgradeReason)) {
      return [
        {
          type: 'upgrade',
          source,
          target: device,
          reason: primaryReason as UpgradeReason,
        },
      ];
    }

    // Metadata-only updates
    return [
      {
        type: 'update-metadata',
        track: device,
        metadata: {},
      },
    ];
  }

  estimateSize(op: SyncOperation): number {
    return calculateOperationSize(op);
  }

  estimateTime(op: SyncOperation): number {
    const size = calculateOperationSize(op);
    if (op.type === 'remove') return 0.1;
    if (op.type === 'update-metadata') return 0.01;
    return estimateTransferTime(size);
  }

  // ---- Execution ----

  async *execute(op: SyncOperation, _ctx: ExecutionContext): AsyncGenerator<OperationProgress> {
    // Stub — real execution stays in DefaultSyncExecutor for now
    yield { operation: op, phase: 'starting' };
    yield { operation: op, phase: 'complete' };
  }

  async *executeBatch(
    operations: SyncOperation[],
    ctx: ExecutionContext
  ): AsyncGenerator<OperationProgress> {
    // Sequential stub — music execution routes through DefaultSyncExecutor in the CLI
    for (const op of operations) {
      yield* this.execute(op, ctx);
    }
  }

  // ---- Device ----

  getDeviceItems(ipod: IpodDatabase): IPodTrack[] {
    return ipod.getTracks().filter((track) => isMusicMediaType(track.mediaType));
  }

  // ---- Display ----

  getDisplayName(op: SyncOperation): string {
    return getOperationDisplayName(op);
  }

  formatDryRun(plan: SyncPlan): DryRunSummary {
    const operationCounts: Record<string, number> = {};
    const operations: DryRunSummary['operations'] = [];
    let toAdd = 0;
    let toRemove = 0;
    let toUpdate = 0;

    for (const op of plan.operations) {
      operationCounts[op.type] = (operationCounts[op.type] ?? 0) + 1;

      if (op.type === 'transcode' || op.type === 'copy') toAdd++;
      else if (op.type === 'remove') toRemove++;
      else if (op.type === 'update-metadata' || op.type === 'upgrade') toUpdate++;

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
// Factory
// =============================================================================

/**
 * Create a MusicHandler instance
 */
export function createMusicHandler(): MusicHandler {
  return new MusicHandler();
}
