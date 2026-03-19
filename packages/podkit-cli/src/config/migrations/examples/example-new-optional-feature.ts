/**
 * EXAMPLE: New optional feature (interactive advisory)
 *
 * Scenario: A new `[transforms.soundCheck]` section is available for Sound Check
 * volume normalization. This is purely optional — configs work fine without it.
 * But we want to tell users about the feature and offer to enable it.
 *
 * This migration:
 * - Informs the user about the new Sound Check feature
 * - Asks if they want to enable it
 * - If yes, appends the [transforms.soundCheck] section
 * - If no, makes no changes (the version bump still happens)
 *
 * WHY this is interactive, not automatic:
 * Automatic migrations should be deterministic — same input always produces same output.
 * Here, whether to enable Sound Check depends on user preference, so we ask. This is
 * the pattern for "advisory" migrations that introduce opt-in features.
 *
 * WHY we don't throw MigrationAbortError on "no":
 * The user declining a feature is different from aborting the migration. Declining
 * means "don't add the section, but continue migrating." Aborting (MigrationAbortError)
 * means "cancel everything, don't write any changes." Only throw MigrationAbortError
 * when the migration truly can't proceed (e.g., a required path doesn't exist and the
 * user refuses to provide one).
 *
 * Copy this template when introducing new optional features that users should know about.
 * This is NOT registered in the migration registry — it's for reference only.
 */
import type { Migration } from '../types.js';

export const exampleNewOptionalFeature: Migration = {
  fromVersion: 93,
  toVersion: 94,
  description: 'Example: Offer to enable Sound Check normalization',
  type: 'interactive',

  async migrate(content, context): Promise<string> {
    // Tell the user about the new feature. info() doesn't block — it just displays
    // a message. Use it to provide context before asking a question.
    context.prompt.info('podkit now supports Sound Check volume normalization.');
    context.prompt.info(
      'This analyzes track loudness and adjusts playback volume so all tracks ' +
        'play at a consistent level.'
    );

    // Ask whether to enable it. The second argument is the default value — false here
    // because we don't want to add config the user didn't ask for.
    const enable = await context.prompt.confirm('Would you like to enable Sound Check?', false);

    if (!enable) {
      // User declined — return content unchanged. The migration engine still bumps
      // the version number, so the user won't be asked again on next run.
      return content;
    }

    // Append the new section. We add it at the end of the file with a blank line
    // separator. This is the simplest approach for new sections — no need to find
    // a specific insertion point.
    //
    // The trailing newline ensures the file ends cleanly.
    const soundCheckSection = [
      '',
      '# Sound Check: normalize playback volume across tracks',
      '[transforms.soundCheck]',
      'enabled = true',
      '',
    ].join('\n');

    return content.trimEnd() + '\n' + soundCheckSection;
  },
};
