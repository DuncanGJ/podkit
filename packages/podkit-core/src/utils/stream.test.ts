/**
 * Tests for stream utilities
 */

import { describe, it, expect, afterEach } from 'bun:test';
import { readFile, unlink, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { streamToTempFile, cleanupTempFile } from './stream.js';

describe('streamToTempFile', () => {
  const createdFiles: string[] = [];

  afterEach(async () => {
    // Clean up any created temp files
    for (const file of createdFiles) {
      try {
        await unlink(file);
      } catch {
        // Ignore if already deleted
      }
    }
    createdFiles.length = 0;
  });

  it('downloads a Node.js Readable stream to temp file', async () => {
    const testContent = 'Hello, World! This is test content.';
    const getStream = async () => Readable.from([testContent]);

    const tempPath = await streamToTempFile(getStream);
    createdFiles.push(tempPath);

    const content = await readFile(tempPath, 'utf-8');
    expect(content).toBe(testContent);
  });

  it('downloads a Web ReadableStream to temp file', async () => {
    const testContent = 'Web stream content for testing.';
    const encoder = new TextEncoder();

    const getStream = async () =>
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(testContent));
          controller.close();
        },
      });

    const tempPath = await streamToTempFile(getStream);
    createdFiles.push(tempPath);

    const content = await readFile(tempPath, 'utf-8');
    expect(content).toBe(testContent);
  });

  it('verifies file size when expectedSize is provided', async () => {
    const testContent = 'Exact size content';
    const expectedSize = Buffer.byteLength(testContent);
    const getStream = async () => Readable.from([testContent]);

    const tempPath = await streamToTempFile(getStream, expectedSize);
    createdFiles.push(tempPath);

    const stats = await stat(tempPath);
    expect(stats.size).toBe(expectedSize);
  });

  it('throws error when size does not match expected', async () => {
    const testContent = 'Short content';
    const wrongExpectedSize = 1000; // Much larger than actual
    const getStream = async () => Readable.from([testContent]);

    await expect(streamToTempFile(getStream, wrongExpectedSize)).rejects.toThrow(
      /Download verification failed/
    );
  });

  it('generates unique temp file paths', async () => {
    const getStream = async () => Readable.from(['content']);

    const path1 = await streamToTempFile(getStream);
    const path2 = await streamToTempFile(getStream);

    createdFiles.push(path1, path2);

    expect(path1).not.toBe(path2);
    expect(path1).toContain('podkit-download-');
    expect(path2).toContain('podkit-download-');
  });
});

describe('cleanupTempFile', () => {
  it('deletes the file without throwing', async () => {
    // Create a temp file first
    const getStream = async () => Readable.from(['temp content']);
    const tempPath = await streamToTempFile(getStream);

    // Verify file exists
    await expect(stat(tempPath)).resolves.toBeDefined();

    // Clean up
    await cleanupTempFile(tempPath);

    // Verify file no longer exists
    await expect(stat(tempPath)).rejects.toThrow();
  });

  it('does not throw when file does not exist', async () => {
    // Should not throw even if file doesn't exist
    await expect(cleanupTempFile('/nonexistent/path/file.tmp')).resolves.toBeUndefined();
  });
});
