/**
 * Diagnostic framework types
 *
 * Provides a check + repair interface for iPod health diagnostics.
 * The core defines domain-level requirements (e.g. "needs source collection")
 * without any awareness of CLI flags or UX. The CLI layer maps requirements
 * to flags, prompts, and user-facing messages.
 */

import type { IpodDatabase } from '../ipod/database.js';
import type { CollectionAdapter } from '../adapters/interface.js';

// ── Check types ──────────────────────────────────────────────────────────────

export interface DiagnosticContext {
  /** iPod mount point path */
  mountPoint: string;
  /** Open iPod database */
  db: IpodDatabase;
}

export interface CheckResult {
  /** Check outcome */
  status: 'pass' | 'fail' | 'warn' | 'skip';
  /** One-line human-readable summary */
  summary: string;
  /** Structured data for JSON output */
  details?: Record<string, unknown>;
  /** URL to relevant documentation */
  docsUrl?: string;
  /** Whether this issue can be automatically repaired */
  repairable: boolean;
}

// ── Repair types ─────────────────────────────────────────────────────────────

/** Domain-level requirements for a repair operation */
export type RepairRequirement = 'source-collection' | 'writable-device';

export interface RepairContext extends DiagnosticContext {
  /** Source collection adapters (already connected) */
  adapters: CollectionAdapter[];
}

export interface RepairResult {
  success: boolean;
  summary: string;
  details?: Record<string, unknown>;
}

export interface DiagnosticRepair {
  /** What the repair does, in domain terms */
  description: string;
  /** What this repair needs to run (the CLI maps these to flags/prompts) */
  requirements: RepairRequirement[];
  /** Execute the repair */
  run(ctx: RepairContext, options?: RepairRunOptions): Promise<RepairResult>;
}

export interface RepairRunOptions {
  /** If true, don't modify the iPod — just report what would change */
  dryRun?: boolean;
  /** Called with progress updates */
  onProgress?: (progress: Record<string, unknown>) => void;
}

// ── Diagnostic check ─────────────────────────────────────────────────────────

export interface DiagnosticCheck {
  /** Unique identifier, e.g. "artwork-integrity" */
  id: string;
  /** Human-readable name, e.g. "Artwork Integrity" */
  name: string;
  /** Run the check */
  check(ctx: DiagnosticContext): Promise<CheckResult>;
  /** If this check can auto-repair, how */
  repair?: DiagnosticRepair;
}

// ── Report ───────────────────────────────────────────────────────────────────

export interface DiagnosticReport {
  /** iPod mount point */
  mountPoint: string;
  /** Device model name */
  deviceModel: string;
  /** Individual check results */
  checks: Array<{ id: string; name: string; hasRepair: boolean } & CheckResult>;
  /** Overall health: true if all checks passed */
  healthy: boolean;
}
