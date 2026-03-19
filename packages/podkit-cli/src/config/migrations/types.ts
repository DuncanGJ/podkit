/**
 * Migration system types
 */

/**
 * Error thrown when a user aborts an interactive migration.
 * The migrate command catches this and exits without writing.
 */
export class MigrationAbortError extends Error {
  constructor(message = 'Migration aborted by user') {
    super(message);
    this.name = 'MigrationAbortError';
  }
}

/**
 * A config migration that transforms raw TOML from one version to another.
 *
 * Migrations work with raw TOML strings rather than typed config objects,
 * because the config structure may have changed incompatibly between versions.
 */
export interface Migration {
  /** Version this migration upgrades from */
  fromVersion: number;
  /** Version this migration upgrades to */
  toVersion: number;
  /** Human-readable description of what this migration does */
  description: string;
  /** Whether this migration requires user interaction */
  type: 'automatic' | 'interactive';
  /**
   * Apply the migration to raw TOML content.
   * Returns the updated TOML content.
   */
  migrate(content: string, context: MigrationContext): Promise<string>;
}

/**
 * Context provided to migration functions.
 * Provides prompt utilities for interactive migrations and filesystem access.
 */
export interface MigrationContext {
  /** Whether this is a dry run (no writes) */
  dryRun: boolean;

  /**
   * Prompt utilities for interactive migrations.
   * Only available for interactive migrations. Automatic migrations should not use these.
   */
  prompt: PromptUtils;

  /**
   * Filesystem utilities for context-aware migrations.
   * Allows migrations to scan directories and read files to make intelligent suggestions.
   */
  fs: FsUtils;
}

/**
 * Prompt utilities provided to interactive migrations.
 */
export interface PromptUtils {
  /** Ask a yes/no question. Returns true for yes. */
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;
  /** Ask the user to choose from a list of options. Returns the chosen value. */
  choose<T extends string>(message: string, choices: ChoiceOption<T>[]): Promise<T>;
  /** Ask for free text input. Returns the entered string. */
  text(message: string, defaultValue?: string): Promise<string>;
  /** Display an informational message (not a prompt). */
  info(message: string): void;
  /** Display a warning message. */
  warn(message: string): void;
}

/**
 * A choice option for the choose() prompt.
 */
export interface ChoiceOption<T extends string = string> {
  /** The value returned when this option is selected */
  value: T;
  /** Display label (shown to user) */
  label: string;
  /** Optional description (shown below the label) */
  description?: string;
}

/**
 * Filesystem utilities provided to migrations.
 */
export interface FsUtils {
  /** Check if a path exists */
  exists(filePath: string): boolean;
  /** Read a file's contents as UTF-8 string */
  readFile(filePath: string): string;
  /** List files in a directory (non-recursive) */
  readdir(dirPath: string): string[];
  /** Check if a path is a directory */
  isDirectory(filePath: string): boolean;
}

/**
 * Result of running the migration engine
 */
export interface MigrationResult {
  /** The updated TOML content after all migrations */
  content: string;
  /** Starting version */
  fromVersion: number;
  /** Final version after migrations */
  toVersion: number;
  /** Migrations that were applied */
  applied: AppliedMigration[];
}

/**
 * Record of a single applied migration
 */
export interface AppliedMigration {
  fromVersion: number;
  toVersion: number;
  description: string;
}
