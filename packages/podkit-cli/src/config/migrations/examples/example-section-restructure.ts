/**
 * EXAMPLE: Section restructure migration
 *
 * Scenario: The `[video.<name>]` config sections are being renamed to `[media.<name>]`
 * as part of a broader media unification effort. This is a breaking change — configs
 * with the old section names won't parse correctly after the schema update.
 *
 * This migration:
 * - Finds all `[video.NAME]` section headers and renames them to `[media.NAME]`
 * - Updates `[defaults]` if it has `video = "..."` (renamed to `media = "..."`)
 *
 * WHY raw TOML regex instead of parse-modify-serialize?
 * TOML serializers don't preserve comments, blank lines, or key ordering. Since config
 * files are hand-edited, preserving formatting is critical for user trust. We use regex
 * on the raw string for structural changes (section headers) and only parse when we
 * need to read specific values.
 *
 * Copy this template when you need to rename or restructure TOML sections.
 * This is NOT registered in the migration registry — it's for reference only.
 */
import type { Migration } from '../types.js';

export const exampleSectionRestructure: Migration = {
  fromVersion: 90,
  toVersion: 91,
  description: 'Example: Rename [video.*] sections to [media.*]',
  type: 'automatic',

  async migrate(content: string): Promise<string> {
    let result = content;

    // Rename all [video.<name>] section headers to [media.<name>].
    //
    // The regex matches TOML section headers at the start of a line:
    //   ^\[video\.   — starts with [video.
    //   ([^\]]+)     — captures the collection name (everything up to the closing bracket)
    //   \]           — closing bracket
    //
    // We use the 'gm' flags: 'g' for all occurrences, 'm' for ^ to match line starts.
    // This is safe because TOML section headers must start at the beginning of a line.
    result = result.replace(/^\[video\.([^\]]+)\]/gm, '[media.$1]');

    // Update the [defaults] section if it references the old "video" key.
    //
    // We look for `video = "..."` that appears after a [defaults] header.
    // This is trickier with regex alone because we need to scope the replacement
    // to the [defaults] section. We split the config into sections and only
    // modify lines within [defaults].
    const lines = result.split('\n');
    let inDefaultsSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // Track which section we're in
      if (trimmed.startsWith('[')) {
        inDefaultsSection = trimmed === '[defaults]';
        continue;
      }

      // Within [defaults], rename the "video" key to "media"
      if (inDefaultsSection && /^video\s*=/.test(trimmed)) {
        lines[i] = line.replace(/^(\s*)video(\s*=)/, '$1media$2');
      }
    }

    return lines.join('\n');
  },
};
