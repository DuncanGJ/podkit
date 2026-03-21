/**
 * Doctor framework — extensible health check runner for iPod devices
 *
 * Provides a simple registry of diagnostic checks that can be run against
 * an iPod. Each check returns a structured result with pass/fail status,
 * human-readable summary, and optional repair instructions.
 */

import { IpodDatabase } from '../ipod/database.js';
import { artworkIntegrityCheck } from './checks/artwork.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface DoctorContext {
  /** iPod mount point path */
  mountPoint: string;
  /** Open iPod database */
  db: IpodDatabase;
}

export interface DoctorRepairInfo {
  /** CLI flag to trigger repair, e.g. "--repair-artwork" */
  flag: string;
  /** Human-readable description of what the repair does */
  description: string;
}

export interface DoctorCheckResult {
  /** Check outcome */
  status: 'pass' | 'fail' | 'warn' | 'skip';
  /** One-line human-readable summary */
  summary: string;
  /** Structured data for JSON output */
  details?: Record<string, unknown>;
  /** If the issue is fixable, how to fix it */
  repair?: DoctorRepairInfo;
  /** URL to relevant documentation */
  docsUrl?: string;
}

export interface DoctorCheck {
  /** Unique identifier, e.g. "artwork-integrity" */
  id: string;
  /** Human-readable name, e.g. "Artwork Integrity" */
  name: string;
  /** Run the check */
  run(ctx: DoctorContext): Promise<DoctorCheckResult>;
}

export interface DoctorReport {
  /** iPod mount point */
  mountPoint: string;
  /** Device model name */
  deviceModel: string;
  /** Individual check results */
  checks: Array<{ id: string; name: string } & DoctorCheckResult>;
  /** Overall health: true if all checks passed */
  healthy: boolean;
}

// ── Registry ────────────────────────────────────────────────────────────────

/** All registered doctor checks */
const CHECKS: DoctorCheck[] = [artworkIntegrityCheck];

// ── Runner ──────────────────────────────────────────────────────────────────

/**
 * Run all registered doctor checks against an iPod.
 *
 * @param mountPoint - iPod mount point path
 * @returns Doctor report with results from all checks
 */
export async function runDoctor(mountPoint: string): Promise<DoctorReport> {
  const db = await IpodDatabase.open(mountPoint);

  try {
    const ctx: DoctorContext = { mountPoint, db };
    const info = db.getInfo();

    const checks: DoctorReport['checks'] = [];

    for (const check of CHECKS) {
      const result = await check.run(ctx);
      checks.push({ id: check.id, name: check.name, ...result });
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
