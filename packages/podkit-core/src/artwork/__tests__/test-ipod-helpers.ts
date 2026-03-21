/**
 * Shared test helpers for creating temporary iPod directory structures.
 *
 * Used by integrity checker tests and future e2e artwork tests.
 */

import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Create a temporary iPod directory with synthetic .ithmb files.
 *
 * @param itmbFiles - Map of filename (e.g. "F1028_1.ithmb") to file size in bytes
 * @returns The root iPod path (containing iPod_Control/Artwork/)
 */
export function createTestIpod(itmbFiles: Record<string, number>): string {
  const ipodPath = mkdtempSync(join(tmpdir(), 'test-ipod-'));
  const artworkDir = join(ipodPath, 'iPod_Control', 'Artwork');
  mkdirSync(artworkDir, { recursive: true });

  for (const [filename, size] of Object.entries(itmbFiles)) {
    writeFileSync(join(artworkDir, filename), Buffer.alloc(size));
  }
  return ipodPath;
}
