/**
 * CLI context - holds configuration and global state for commands
 *
 * This module provides a way for commands to access the loaded configuration
 * without needing to pass it through every function call.
 */

import type { PodkitConfig, GlobalOptions, LoadConfigResult } from './config/index.js';

/**
 * CLI execution context
 */
export interface CliContext {
  /** Merged configuration from all sources */
  config: PodkitConfig;
  /** Global CLI options */
  globalOpts: GlobalOptions;
  /** Config loading metadata */
  configResult: LoadConfigResult;
}

/**
 * Current CLI context (set during command execution)
 */
let currentContext: CliContext | undefined;

/**
 * Set the current CLI context
 *
 * Called by main.ts before command actions run
 */
export function setContext(ctx: CliContext): void {
  currentContext = ctx;
}

/**
 * Get the current CLI context
 *
 * @throws Error if called before context is set
 */
export function getContext(): CliContext {
  if (!currentContext) {
    throw new Error(
      'CLI context not initialized. This is a bug - context should be set before commands run.'
    );
  }
  return currentContext;
}

/**
 * Get the current config (convenience wrapper)
 */
export function getConfig(): PodkitConfig {
  return getContext().config;
}

/**
 * Get global options (convenience wrapper)
 */
export function getGlobalOpts(): GlobalOptions {
  return getContext().globalOpts;
}

/**
 * Clear the context (for testing)
 */
export function clearContext(): void {
  currentContext = undefined;
}
