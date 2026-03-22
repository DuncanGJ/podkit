/**
 * ContentTypeHandler interface and registry
 *
 * Defines a generic interface for content-type-specific sync operations
 * (music, video). Each handler encapsulates diffing, planning, execution,
 * and display logic for its content type.
 *
 * @module
 */

import type { IpodDatabase } from '../ipod/database.js';
import type { SyncOperation, SyncPlan, UpdateReason } from './types.js';

// =============================================================================
// Option Types
// =============================================================================

/**
 * Options passed to handler diff methods
 */
export interface HandlerDiffOptions {
  skipUpgrades?: boolean;
  forceTranscode?: boolean;
  transcodingActive?: boolean;
  presetBitrate?: number;
  presetChanged?: boolean;
  transformsEnabled?: boolean;
  transforms?: Record<string, string>;
}

/**
 * Options passed to handler plan methods
 */
export interface HandlerPlanOptions {
  qualityPreset?: string;
  deviceSupportsAlac?: boolean;
  customBitrate?: number;
  hardwareAcceleration?: boolean;
}

/**
 * Context for executing sync operations
 */
export interface ExecutionContext {
  ipod: IpodDatabase;
  signal?: AbortSignal;
  dryRun?: boolean;
  tempDir?: string;
}

// =============================================================================
// Progress and Summary Types
// =============================================================================

/**
 * Progress update for a single operation
 */
export interface OperationProgress {
  operation: SyncOperation;
  phase: 'starting' | 'in-progress' | 'complete' | 'failed';
  progress?: number;
  error?: Error;
  skipped?: boolean;
  transcodeProgress?: { percent: number; speed?: string };
}

/**
 * Summary of a sync plan for dry-run display
 */
export interface DryRunSummary {
  toAdd: number;
  toRemove: number;
  existing: number;
  toUpdate: number;
  operationCounts: Record<string, number>;
  estimatedSize: number;
  estimatedTime: number;
  warnings: string[];
  operations: Array<{ type: string; displayName: string; size?: number }>;
}

// =============================================================================
// ContentTypeHandler Interface
// =============================================================================

/**
 * Generic interface for content-type-specific sync operations.
 *
 * Each handler encapsulates the logic for matching, diffing, planning,
 * executing, and displaying sync operations for a specific content type
 * (e.g., music tracks, videos).
 *
 * @typeParam TSource - The source item type (e.g., CollectionTrack, CollectionVideo)
 * @typeParam TDevice - The device item type (e.g., IPodTrack, IPodVideo)
 */
export interface ContentTypeHandler<TSource, TDevice> {
  /** Content type identifier (e.g., 'music', 'video') */
  readonly type: string;

  // ---- Diffing ----

  /** Generate a match key for a source item */
  generateMatchKey(source: TSource): string;

  /** Generate a match key for a device item */
  generateDeviceMatchKey(device: TDevice): string;

  /** Generate a match key with transforms applied (optional) */
  applyTransformKey?(source: TSource): string;

  /** Get the unique identifier for a device item */
  getDeviceItemId(device: TDevice): string;

  /** Detect reasons a matched pair needs updating */
  detectUpdates(source: TSource, device: TDevice, options: HandlerDiffOptions): UpdateReason[];

  // ---- Planning ----

  /** Plan an add operation for a source item */
  planAdd(source: TSource, options: HandlerPlanOptions): SyncOperation;

  /** Plan a remove operation for a device item */
  planRemove(device: TDevice): SyncOperation;

  /** Plan update operations for a matched pair with detected reasons */
  planUpdate(source: TSource, device: TDevice, reasons: UpdateReason[]): SyncOperation[];

  /** Estimate the output size in bytes for an operation */
  estimateSize(op: SyncOperation): number;

  /** Estimate the time in seconds for an operation */
  estimateTime(op: SyncOperation): number;

  // ---- Execution ----

  /** Execute a single operation, yielding progress updates */
  execute(op: SyncOperation, ctx: ExecutionContext): AsyncGenerator<OperationProgress>;

  /** Execute a batch of operations sequentially (optional optimization) */
  executeBatch?(
    operations: SyncOperation[],
    ctx: ExecutionContext
  ): AsyncGenerator<OperationProgress>;

  // ---- Device ----

  /** Get all items of this content type from the iPod database */
  getDeviceItems(ipod: IpodDatabase): TDevice[];

  // ---- Display ----

  /** Get a human-readable display name for an operation */
  getDisplayName(op: SyncOperation): string;

  /** Format a sync plan into a dry-run summary */
  formatDryRun(plan: SyncPlan): DryRunSummary;
}

// =============================================================================
// Handler Registry
// =============================================================================

const handlers = new Map<string, ContentTypeHandler<any, any>>();

/**
 * Register a content type handler
 */
export function registerHandler(handler: ContentTypeHandler<any, any>): void {
  handlers.set(handler.type, handler);
}

/**
 * Get a registered handler by type
 */
export function getHandler(type: string): ContentTypeHandler<any, any> | undefined {
  return handlers.get(type);
}

/**
 * Get all registered handlers
 */
export function getAllHandlers(): ContentTypeHandler<any, any>[] {
  return Array.from(handlers.values());
}

/**
 * Clear all registered handlers (for testing)
 */
export function clearHandlers(): void {
  handlers.clear();
}
