/**
 * Stream utilities for handling remote file downloads
 *
 * Provides utilities for streaming remote content to temporary files
 * with optional size verification.
 */

import { createWriteStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

/**
 * Download a stream to a temporary file with optional size verification
 *
 * Handles both Web ReadableStream and Node.js Readable streams.
 * If expectedSize is provided, verifies the downloaded file matches.
 *
 * @param getStream - Function that returns a stream (called lazily)
 * @param expectedSize - Optional expected file size in bytes
 * @returns Path to the temporary file
 * @throws Error if size verification fails
 *
 * @example
 * ```typescript
 * const tempPath = await streamToTempFile(
 *   () => fetch(url).then(r => r.body!),
 *   12345 // expected size
 * );
 * // Use tempPath...
 * await unlink(tempPath); // Clean up
 * ```
 */
export async function streamToTempFile(
  getStream: () => Promise<ReadableStream | Readable>,
  expectedSize?: number
): Promise<string> {
  const tempPath = join(tmpdir(), `podkit-download-${randomUUID()}`);
  const stream = await getStream();

  // Handle both Web ReadableStream and Node Readable
  // Web ReadableStream doesn't have 'pipe' method, Node Readable does
  const nodeStream =
    'pipe' in stream && typeof stream.pipe === 'function'
      ? (stream as Readable)
      : Readable.fromWeb(stream as ReadableStream);

  await pipeline(nodeStream, createWriteStream(tempPath));

  // Verify size if expected size is provided
  if (expectedSize !== undefined) {
    const stats = await stat(tempPath);
    if (stats.size !== expectedSize) {
      await unlink(tempPath);
      throw new Error(
        `Download verification failed: expected ${expectedSize} bytes, got ${stats.size}`
      );
    }
  }

  return tempPath;
}

/**
 * Helper to clean up a temporary file, ignoring errors
 */
export async function cleanupTempFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Ignore cleanup errors
  }
}
