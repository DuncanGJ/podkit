/**
 * EXAMPLE: Environment variable change notification
 *
 * Scenario: The `PODKIT_VIDEO_PATH` environment variable is being renamed to
 * `PODKIT_MEDIA_PATH` to match the section rename from [video] to [media].
 * The config file itself may not reference env vars, but Docker users and CI
 * pipelines rely on them.
 *
 * This migration:
 * - Warns the user about the env var change
 * - Shows the old and new variable names
 * - Returns the config content unchanged (the version bump is the only file change)
 *
 * WHY we can't auto-migrate environment variables:
 * Env vars live outside the config file — in shell profiles, Docker Compose files,
 * CI configs, systemd units, etc. A config migration can't reach into those systems.
 * The best we can do is inform the user so they can update their environment. This is
 * the right approach for any change that affects external configuration.
 *
 * WHY this is automatic, not interactive:
 * Even though this uses prompt.warn() and prompt.info(), it doesn't ask any questions.
 * The distinction matters: automatic migrations can display messages (info/warn are
 * just output), but only interactive migrations should block on user input (confirm,
 * choose, text). Since this migration always produces the same output regardless of
 * user action, it's automatic.
 *
 * Copy this template when renaming env vars, CLI flags, or other external interfaces.
 * This is NOT registered in the migration registry — it's for reference only.
 */
import type { Migration, MigrationContext } from '../types.js';

export const exampleEnvVarChange: Migration = {
  fromVersion: 95,
  toVersion: 96,
  description: 'Example: Notify about PODKIT_VIDEO_PATH rename',
  type: 'automatic',

  async migrate(content: string, context: MigrationContext): Promise<string> {
    // Check if the old env var is currently set. This helps us give targeted advice:
    // if the user isn't using the old var, we can skip the warning entirely.
    //
    // NOTE: In a real migration, you might check process.env directly. Here we keep
    // it simple and always show the message since this is an example.

    // Warn about the change. warn() is for things the user needs to act on;
    // info() is for supplementary details.
    context.prompt.warn(
      'The PODKIT_VIDEO_PATH environment variable has been renamed to PODKIT_MEDIA_PATH.'
    );
    context.prompt.info(
      'If you use this variable in your shell profile, Docker Compose file, or CI config, ' +
        'please update it:'
    );
    context.prompt.info('  Old: PODKIT_VIDEO_PATH=/path/to/videos');
    context.prompt.info('  New: PODKIT_MEDIA_PATH=/path/to/videos');
    context.prompt.info('The old variable will continue to work until the next major version.');

    // Return content unchanged. The migration engine handles bumping the version
    // field, so even though we didn't modify the content, the config will be updated
    // to reflect that this migration has been applied.
    return content;
  },
};
