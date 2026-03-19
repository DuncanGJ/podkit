/**
 * EXAMPLE: New required field with default value
 *
 * Scenario: The `encoding` field (VBR vs CBR mode) becomes required. Previously it
 * was optional with an implicit default of "vbr". Now the schema requires it to be
 * explicit, so existing configs without it need the default inserted.
 *
 * This migration:
 * - Checks if `encoding` is already set at the global level
 * - If not, inserts `encoding = "vbr"` after the last global-scope field
 *
 * WHY we insert rather than append:
 * Global fields should stay grouped together at the top of the file, before any
 * section headers. Appending to the end of the file would put it after all sections,
 * which is valid TOML but confusing to read. We find the last global field and insert
 * after it so the config stays well-organized.
 *
 * WHY we use smol-toml to check existence:
 * Regex can't reliably distinguish a global `encoding` from one inside a section.
 * Parsing with smol-toml gives us the actual top-level keys. We only use the parser
 * for reading — the insertion is done with string manipulation to preserve formatting.
 *
 * Copy this template when a previously-optional field becomes required.
 * This is NOT registered in the migration registry — it's for reference only.
 */
import { parse as parseTOML } from 'smol-toml';
import type { Migration } from '../types.js';

export const exampleNewRequiredField: Migration = {
  fromVersion: 92,
  toVersion: 93,
  description: 'Example: Add required encoding field with default',
  type: 'automatic',

  async migrate(content: string): Promise<string> {
    // Use the TOML parser to check if 'encoding' already exists at the top level.
    // This is safer than regex because `encoding = "..."` could appear inside a
    // [devices.*] section, and we only care about the global scope.
    const parsed = parseTOML(content) as Record<string, unknown>;
    if (parsed.encoding !== undefined) {
      // Already set — nothing to do
      return content;
    }

    // Find the right place to insert: after the last global-scope key-value pair,
    // before the first section header.
    //
    // Global-scope lines are everything before the first `[section]` header.
    // We want to insert after the last non-blank, non-comment line in that region.
    const lines = content.split('\n');
    let lastGlobalFieldIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i]!.trim();

      // Stop at the first section header — everything after is scoped
      if (trimmed.startsWith('[')) {
        break;
      }

      // Track the last line that looks like a key-value pair (not a comment or blank)
      if (trimmed !== '' && !trimmed.startsWith('#')) {
        lastGlobalFieldIndex = i;
      }
    }

    // Insert after the last global field, or at the top if there are no global fields
    const insertIndex = lastGlobalFieldIndex + 1;
    lines.splice(insertIndex, 0, 'encoding = "vbr"');

    return lines.join('\n');
  },
};
