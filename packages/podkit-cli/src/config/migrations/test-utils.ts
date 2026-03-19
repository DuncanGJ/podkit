import type { MigrationContext, PromptUtils, FsUtils } from './types.js';

/**
 * Create a test migration context with mocked prompts and filesystem.
 * Useful for testing migrations without real user interaction or filesystem access.
 */
export function createTestContext(overrides?: {
  dryRun?: boolean;
  prompt?: Partial<PromptUtils>;
  fs?: Partial<FsUtils>;
}): MigrationContext {
  return {
    dryRun: overrides?.dryRun ?? false,
    prompt: {
      confirm: overrides?.prompt?.confirm ?? (async () => true),
      choose: overrides?.prompt?.choose ?? (async (_msg, choices) => choices[0]!.value),
      text: overrides?.prompt?.text ?? (async (_msg, defaultValue) => defaultValue ?? ''),
      info: overrides?.prompt?.info ?? (() => {}),
      warn: overrides?.prompt?.warn ?? (() => {}),
    },
    fs: {
      exists: overrides?.fs?.exists ?? (() => true),
      readFile: overrides?.fs?.readFile ?? (() => ''),
      readdir: overrides?.fs?.readdir ?? (() => []),
      isDirectory: overrides?.fs?.isDirectory ?? (() => false),
    },
  };
}
