import type { Migration, MigrationContext, MigrationResult } from './types.js';
import { registry } from './registry.js';
import { CURRENT_CONFIG_VERSION } from '../version.js';

/**
 * Run all applicable migrations on raw TOML content.
 *
 * Migrations are chained step-by-step: each migration's fromVersion must
 * match the version produced by the previous step. This ensures migrations
 * are applied in a contiguous chain (0→1, 1→2, etc.) even if the registry
 * has gaps.
 */
export async function runMigrations(
  content: string,
  currentVersion: number,
  context: MigrationContext
): Promise<MigrationResult> {
  // Build a lookup from fromVersion → migration for step-by-step chaining
  const byFromVersion = new Map<number, Migration>();
  for (const m of registry) {
    if (m.toVersion <= CURRENT_CONFIG_VERSION) {
      byFromVersion.set(m.fromVersion, m);
    }
  }

  let result = content;
  let version = currentVersion;
  const applied: MigrationResult['applied'] = [];

  // Chain migrations step by step
  while (version < CURRENT_CONFIG_VERSION) {
    const migration = byFromVersion.get(version);
    if (!migration) break; // No migration for this version — stop

    result = await migration.migrate(result, context);
    applied.push({
      fromVersion: migration.fromVersion,
      toVersion: migration.toVersion,
      description: migration.description,
    });
    version = migration.toVersion;
  }

  return {
    content: result,
    fromVersion: currentVersion,
    toVersion: version,
    applied,
  };
}

/**
 * Get the list of pending migrations for a given version.
 * Returns the contiguous chain of migrations from currentVersion to CURRENT_CONFIG_VERSION.
 */
export function getPendingMigrations(currentVersion: number): Migration[] {
  const byFromVersion = new Map<number, Migration>();
  for (const m of registry) {
    if (m.toVersion <= CURRENT_CONFIG_VERSION) {
      byFromVersion.set(m.fromVersion, m);
    }
  }

  const pending: Migration[] = [];
  let version = currentVersion;
  while (version < CURRENT_CONFIG_VERSION) {
    const migration = byFromVersion.get(version);
    if (!migration) break;
    pending.push(migration);
    version = migration.toVersion;
  }
  return pending;
}
