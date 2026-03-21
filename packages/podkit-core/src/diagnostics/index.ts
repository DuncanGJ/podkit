/**
 * Diagnostics framework — extensible health check runner for iPod devices
 *
 * Provides a registry of diagnostic checks that can be run against an iPod.
 * Each check returns a structured result with pass/fail status, human-readable
 * summary, and optional repair capability. The repair interface describes
 * domain-level requirements without any CLI/UX awareness — the consuming
 * layer (CLI, GUI, etc.) maps requirements to its own UX patterns.
 */

import { IpodDatabase } from '../ipod/database.js';
import { artworkIntegrityCheck } from './checks/artwork.js';
import { orphanFilesCheck } from './checks/orphans.js';
import type { DiagnosticCheck, DiagnosticReport, DiagnosticContext } from './types.js';

// Re-export types for consumers
export type {
  DiagnosticContext,
  CheckResult,
  RepairRequirement,
  RepairContext,
  RepairResult,
  RepairRunOptions,
  DiagnosticRepair,
  DiagnosticCheck,
  DiagnosticReport,
} from './types.js';

// ── Registry ────────────────────────────────────────────────────────────────

/** All registered diagnostic checks */
const CHECKS: DiagnosticCheck[] = [artworkIntegrityCheck, orphanFilesCheck];

/**
 * Get a diagnostic check by ID.
 *
 * Useful for the CLI to look up a specific check when the user requests
 * a targeted repair (e.g. `podkit doctor --repair artwork-integrity`).
 */
export function getDiagnosticCheck(id: string): DiagnosticCheck | undefined {
  return CHECKS.find((c) => c.id === id);
}

/** Get all registered diagnostic check IDs */
export function getDiagnosticCheckIds(): string[] {
  return CHECKS.map((c) => c.id);
}

// ── Runner ──────────────────────────────────────────────────────────────────

/**
 * Run all registered diagnostic checks against an iPod.
 *
 * @param mountPoint - iPod mount point path
 * @returns Diagnostic report with results from all checks
 */
export async function runDiagnostics(mountPoint: string): Promise<DiagnosticReport> {
  const db = await IpodDatabase.open(mountPoint);

  try {
    const ctx: DiagnosticContext = { mountPoint, db };
    const info = db.getInfo();

    const checks: DiagnosticReport['checks'] = [];

    for (const check of CHECKS) {
      const result = await check.check(ctx);
      checks.push({
        id: check.id,
        name: check.name,
        hasRepair: check.repair !== undefined,
        ...result,
      });
    }

    const healthy = checks.every((c) => c.status === 'pass' || c.status === 'skip');

    return {
      mountPoint,
      deviceModel: info.device.modelName ?? 'Unknown',
      checks,
      healthy,
    };
  } finally {
    db.close();
  }
}
