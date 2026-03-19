/**
 * EXAMPLE: Deprecation with removal
 *
 * Scenario: Music collection sections used to use `source = "/path"` but this was
 * renamed to `path = "/path"` for consistency with video collections. The `source`
 * field was deprecated (with warnings) in a previous version, and this migration
 * completes the removal by replacing it.
 *
 * This migration:
 * - Finds `source = "..."` lines inside `[music.*]` sections
 * - Renames them to `path = "..."`
 * - Adds an inline comment noting the migration
 *
 * THE TWO-PHASE DEPRECATION PATTERN:
 * Phase 1 (version N): Add runtime warnings when the old field is used. The config
 *   parser accepts both old and new field names. No migration needed — the old field
 *   still works. This gives users time to update manually.
 * Phase 2 (version N+1): This migration. The old field is auto-renamed and the
 *   parser drops support for it. Users who ignored the warnings get auto-migrated;
 *   users who already updated manually are unaffected.
 *
 * WHY we scope to [music.*] sections:
 * The field name `source` could theoretically appear in other contexts. By tracking
 * which TOML section we're in, we only rename it where it's relevant. This avoids
 * false positives if a future config section legitimately uses a `source` key.
 *
 * Copy this template when completing a deprecation cycle.
 * This is NOT registered in the migration registry — it's for reference only.
 */
import type { Migration } from '../types.js';

export const exampleDeprecation: Migration = {
  fromVersion: 94,
  toVersion: 95,
  description: 'Example: Replace deprecated source field with path',
  type: 'automatic',

  async migrate(content: string): Promise<string> {
    const lines = content.split('\n');
    let inMusicSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // Track which section we're in by watching for section headers.
      // A [music.*] section starts with `[music.` and any other `[` header ends it.
      if (trimmed.startsWith('[')) {
        inMusicSection = /^\[music\.[^\]]+\]/.test(trimmed);
        continue;
      }

      // Within a music section, replace `source = "..."` with `path = "..."`
      if (inMusicSection && /^source\s*=/.test(trimmed)) {
        // Preserve the original indentation and value. The regex captures:
        //   ^(\s*)    — leading whitespace
        //   source    — the old field name
        //   (\s*=\s*) — equals sign with surrounding whitespace
        //   (.*)      — the value (everything after =, including quotes)
        lines[i] = line.replace(
          /^(\s*)source(\s*=\s*)(.*)/,
          "$1path$2$3 # Migrated from 'source' field"
        );
      }
    }

    return lines.join('\n');
  },
};
