import { parse as parseTOML } from 'smol-toml';
import type { Migration } from './types.js';

/**
 * Migration 0->1: Add version field
 *
 * Pre-versioning configs have no `version` field. This migration adds
 * `version = 1` as the first non-comment line in the config file.
 * No other changes are made — this establishes the versioning baseline.
 */
export const migration0001: Migration = {
  fromVersion: 0,
  toVersion: 1,
  description: 'Add config version field',
  type: 'automatic',
  async migrate(content: string): Promise<string> {
    // Check for existing top-level version field using the TOML parser
    // (not regex, which could match version fields inside TOML sections)
    const parsed = parseTOML(content) as Record<string, unknown>;
    if (parsed.version !== undefined) {
      return content;
    }

    // Insert version = 1 after any leading comments/blank lines
    const lines = content.split('\n');
    let insertIndex = 0;

    // Skip leading comments and blank lines
    while (insertIndex < lines.length) {
      const line = lines[insertIndex]!.trim();
      if (line === '' || line.startsWith('#')) {
        insertIndex++;
      } else {
        break;
      }
    }

    // Insert version field with a blank line after it (unless at start of file)
    if (insertIndex > 0) {
      lines.splice(insertIndex, 0, 'version = 1', '');
    } else {
      lines.unshift('version = 1', '');
    }

    return lines.join('\n');
  },
};
