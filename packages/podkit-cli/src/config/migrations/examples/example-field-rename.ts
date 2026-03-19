/**
 * EXAMPLE: Field rename migration
 *
 * Scenario: The `customBitrate` field is being renamed to `bitrate` for brevity.
 * This field can appear in two places:
 * - Global scope (top of config, before any section headers)
 * - Per-device sections (`[devices.<name>]`)
 *
 * This migration:
 * - Renames `customBitrate` to `bitrate` wherever it appears
 *
 * WHY a simple global replace works here:
 * The field name `customBitrate` is unique enough that it won't collide with other
 * keys or appear inside string values. For field names that could be ambiguous
 * (e.g., renaming `path` to `source`), you'd need section-aware replacement instead
 * — see example-section-restructure.ts for that pattern.
 *
 * NOTE on field type changes:
 * If the field type also changes (e.g., string to number), you can't just rename —
 * you need to parse the old value and convert it. For example:
 *   customBitrate = "256k"  →  bitrate = 256
 * In that case, use a regex with a capture group to extract and transform the value.
 *
 * Copy this template when you need to rename fields across the config.
 * This is NOT registered in the migration registry — it's for reference only.
 */
import type { Migration } from '../types.js';

export const exampleFieldRename: Migration = {
  fromVersion: 91,
  toVersion: 92,
  description: 'Example: Rename customBitrate to bitrate',
  type: 'automatic',

  async migrate(content: string): Promise<string> {
    // Replace `customBitrate` with `bitrate` at the start of any line.
    //
    // The regex:
    //   ^(\s*)           — captures leading whitespace (preserves indentation)
    //   customBitrate    — the old field name (literal match)
    //   (\s*=)           — captures the equals sign and surrounding whitespace
    //
    // By anchoring to ^ and matching the key-equals pattern, we avoid replacing
    // the string inside comments or values. The 'gm' flags handle multiple
    // occurrences across lines.
    return content.replace(/^(\s*)customBitrate(\s*=)/gm, '$1bitrate$2');
  },
};
