/**
 * Build script for the podkit demo binary.
 *
 * Produces a standalone executable that uses mock implementations so the demo
 * can run without a real iPod, FFmpeg, or any music files.
 *
 * Two modules are swapped at build time via plugins:
 *   - @podkit/core       → src/mock-core.ts  (canned data, no real dependencies)
 *   - CLI utils/fs.ts    → src/mock-fs.ts    (path checks always pass)
 */

import { resolve } from 'node:path';
import type { BunPlugin } from 'bun';

const SCRIPT_DIR = import.meta.dirname;
const ROOT = resolve(SCRIPT_DIR, '../..');
const CLI_ENTRY = resolve(ROOT, 'packages/podkit-cli/src/main.ts');
const MOCK_CORE = resolve(SCRIPT_DIR, 'src/mock-core.ts');
const MOCK_FS = resolve(SCRIPT_DIR, 'src/mock-fs.ts');
const OUT_FILE = resolve(SCRIPT_DIR, 'bin/podkit-demo');

const mockPlugin: BunPlugin = {
  name: 'mock-podkit-demo',
  setup(build) {
    build.onResolve({ filter: /^@podkit\/core$/ }, () => {
      return { path: MOCK_CORE };
    });
    // Intercept the CLI's filesystem validation module
    build.onResolve({ filter: /\/utils\/fs\.js$/ }, () => {
      return { path: MOCK_FS };
    });
  },
};

console.log('Building demo binary...');
console.log(`  Entry:    ${CLI_ENTRY}`);
console.log(`  Output:   ${OUT_FILE}`);

const result = await Bun.build({
  entrypoints: [CLI_ENTRY],
  compile: {
    outfile: OUT_FILE,
  },
  target: 'bun',
  define: {
    PODKIT_VERSION: JSON.stringify('0.0.0-demo'),
  },
  plugins: [mockPlugin],
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log('Build succeeded.');
