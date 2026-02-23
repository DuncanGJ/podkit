/**
 * Unit tests for artwork extraction
 *
 * Tests the extraction logic, dimension parsing, and temp file handling.
 * Uses mocks for music-metadata parsing since we don't have real audio files.
 */

import { describe, expect, it, beforeEach, afterEach, spyOn } from 'bun:test';
import { readFile, stat } from 'node:fs/promises';
import {
  extractArtwork,
  saveArtworkToTemp,
  cleanupTempArtwork,
  cleanupAllTempArtwork,
  extractAndSaveArtwork,
} from './extractor.js';
import type { ExtractedArtwork } from './types.js';

// We need to mock music-metadata for unit tests
// Import the module to allow mocking
import * as mm from 'music-metadata';

describe('extractArtwork', () => {
  // Create a spy on mm.parseFile that we can control
  let parseFileSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Mock parseFile to return controlled data
    parseFileSpy = spyOn(mm, 'parseFile');
  });

  afterEach(() => {
    // Restore the original implementation
    parseFileSpy.mockRestore();
  });

  describe('when file has embedded artwork', () => {
    it('extracts JPEG artwork', async () => {
      // Create a minimal JPEG buffer (just the header for dimension detection)
      // Real JPEG: FFD8 (SOI) + FFE0 (APP0 marker) + ... + FFC0 (SOF0 with dimensions)
      const jpegData = createMockJpeg(320, 240);

      parseFileSpy.mockResolvedValue({
        common: {
          picture: [
            {
              format: 'image/jpeg',
              data: new Uint8Array(jpegData),
              type: 'Cover (front)',
            },
          ],
        },
        format: {},
      } as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.mp3');

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/jpeg');
      expect(result!.width).toBe(320);
      expect(result!.height).toBe(240);
      expect(result!.data).toBeInstanceOf(Buffer);
    });

    it('extracts PNG artwork', async () => {
      // Create a minimal PNG buffer (signature + IHDR chunk)
      const pngData = createMockPng(500, 500);

      parseFileSpy.mockResolvedValue({
        common: {
          picture: [
            {
              format: 'image/png',
              data: new Uint8Array(pngData),
              type: 'Cover (front)',
            },
          ],
        },
        format: {},
      } as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.flac');

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/png');
      expect(result!.width).toBe(500);
      expect(result!.height).toBe(500);
    });

    it('prefers front cover when multiple images present', async () => {
      const frontCoverData = createMockJpeg(600, 600);
      const backCoverData = createMockJpeg(300, 300);

      parseFileSpy.mockResolvedValue({
        common: {
          picture: [
            {
              format: 'image/jpeg',
              data: new Uint8Array(backCoverData),
              type: 'Cover (back)',
            },
            {
              format: 'image/jpeg',
              data: new Uint8Array(frontCoverData),
              type: 'Cover (front)',
            },
          ],
        },
        format: {},
      } as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.m4a');

      expect(result).not.toBeNull();
      // Front cover should be selected (600x600)
      expect(result!.width).toBe(600);
      expect(result!.height).toBe(600);
    });

    it('handles images with unknown type', async () => {
      const imageData = createMockJpeg(400, 400);

      parseFileSpy.mockResolvedValue({
        common: {
          picture: [
            {
              format: 'image/jpeg',
              data: new Uint8Array(imageData),
              // No type specified
            },
          ],
        },
        format: {},
      } as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.flac');

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/jpeg');
    });
  });

  describe('when file has no artwork', () => {
    it('returns null for files without artwork', async () => {
      parseFileSpy.mockResolvedValue({
        common: {},
        format: {},
      } as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.flac');

      expect(result).toBeNull();
    });

    it('returns null for empty picture array', async () => {
      parseFileSpy.mockResolvedValue({
        common: {
          picture: [],
        },
        format: {},
        native: {},
        quality: { warnings: [] },
      } as unknown as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.mp3');

      expect(result).toBeNull();
    });

    it('calls onSkip callback when no artwork found', async () => {
      parseFileSpy.mockResolvedValue({
        common: {},
        format: {},
      } as mm.IAudioMetadata);

      const skipReasons: string[] = [];
      const onSkip = (reason: string) => skipReasons.push(reason);

      await extractArtwork('/path/to/song.flac', { onSkip });

      expect(skipReasons.length).toBe(1);
      expect(skipReasons[0]).toContain('No artwork embedded');
    });
  });

  describe('error handling', () => {
    it('returns null on parse errors', async () => {
      parseFileSpy.mockRejectedValue(new Error('File not found'));

      const result = await extractArtwork('/nonexistent/file.flac');

      expect(result).toBeNull();
    });

    it('calls onSkip callback on errors', async () => {
      parseFileSpy.mockRejectedValue(new Error('Corrupt file'));

      const skipReasons: string[] = [];
      const onSkip = (reason: string) => skipReasons.push(reason);

      await extractArtwork('/corrupt/file.mp3', { onSkip });

      expect(skipReasons.length).toBe(1);
      expect(skipReasons[0]).toContain('Failed to extract artwork');
      expect(skipReasons[0]).toContain('Corrupt file');
    });
  });

  describe('dimension detection', () => {
    it('returns 0x0 for unsupported image formats', async () => {
      parseFileSpy.mockResolvedValue({
        common: {
          picture: [
            {
              format: 'image/gif',
              data: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
              type: 'Cover (front)',
            },
          ],
        },
        format: {},
      } as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.flac');

      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('image/gif');
      expect(result!.width).toBe(0);
      expect(result!.height).toBe(0);
    });

    it('handles malformed JPEG data gracefully', async () => {
      // Invalid JPEG data (not starting with FFD8)
      const badData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);

      parseFileSpy.mockResolvedValue({
        common: {
          picture: [
            {
              format: 'image/jpeg',
              data: badData,
              type: 'Cover (front)',
            },
          ],
        },
        format: {},
      } as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.mp3');

      expect(result).not.toBeNull();
      expect(result!.width).toBe(0);
      expect(result!.height).toBe(0);
    });

    it('handles malformed PNG data gracefully', async () => {
      // Invalid PNG data (wrong signature)
      const badData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);

      parseFileSpy.mockResolvedValue({
        common: {
          picture: [
            {
              format: 'image/png',
              data: badData,
              type: 'Cover (front)',
            },
          ],
        },
        format: {},
      } as mm.IAudioMetadata);

      const result = await extractArtwork('/path/to/song.flac');

      expect(result).not.toBeNull();
      expect(result!.width).toBe(0);
      expect(result!.height).toBe(0);
    });
  });
});

describe('saveArtworkToTemp', () => {
  afterEach(async () => {
    await cleanupAllTempArtwork();
  });

  it('saves artwork to temp file with correct extension', async () => {
    const artwork: ExtractedArtwork = {
      data: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      mimeType: 'image/jpeg',
      width: 100,
      height: 100,
    };

    const tempPath = await saveArtworkToTemp(artwork);

    expect(tempPath).toContain('.jpg');
    expect(tempPath).toContain('artwork-');

    // Verify file exists and has correct content
    const content = await readFile(tempPath);
    expect(Buffer.compare(content, artwork.data)).toBe(0);
  });

  it('uses .png extension for PNG images', async () => {
    const artwork: ExtractedArtwork = {
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      mimeType: 'image/png',
      width: 100,
      height: 100,
    };

    const tempPath = await saveArtworkToTemp(artwork);

    expect(tempPath).toContain('.png');
  });

  it('defaults to .jpg for unknown MIME types', async () => {
    const artwork: ExtractedArtwork = {
      data: Buffer.from([0x00, 0x00, 0x00, 0x00]),
      mimeType: 'image/unknown',
      width: 100,
      height: 100,
    };

    const tempPath = await saveArtworkToTemp(artwork);

    expect(tempPath).toContain('.jpg');
  });
});

describe('cleanupTempArtwork', () => {
  it('removes temp file', async () => {
    const artwork: ExtractedArtwork = {
      data: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      mimeType: 'image/jpeg',
      width: 100,
      height: 100,
    };

    const tempPath = await saveArtworkToTemp(artwork);

    // Verify file exists
    await stat(tempPath); // throws if not exists

    await cleanupTempArtwork(tempPath);

    // Verify file is removed
    await expect(stat(tempPath)).rejects.toThrow();
  });

  it('does not throw for non-existent files', async () => {
    // Should not throw
    await cleanupTempArtwork('/nonexistent/file.jpg');
  });
});

describe('cleanupAllTempArtwork', () => {
  it('removes all temp files', async () => {
    const artwork1: ExtractedArtwork = {
      data: Buffer.from([0xff, 0xd8]),
      mimeType: 'image/jpeg',
      width: 100,
      height: 100,
    };
    const artwork2: ExtractedArtwork = {
      data: Buffer.from([0x89, 0x50]),
      mimeType: 'image/png',
      width: 200,
      height: 200,
    };

    const path1 = await saveArtworkToTemp(artwork1);
    const path2 = await saveArtworkToTemp(artwork2);

    // Verify files exist
    await stat(path1);
    await stat(path2);

    await cleanupAllTempArtwork();

    // Both should be removed
    await expect(stat(path1)).rejects.toThrow();
    await expect(stat(path2)).rejects.toThrow();
  });
});

describe('extractAndSaveArtwork', () => {
  let parseFileSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    parseFileSpy = spyOn(mm, 'parseFile');
  });

  afterEach(async () => {
    parseFileSpy.mockRestore();
    await cleanupAllTempArtwork();
  });

  it('extracts and saves artwork in one call', async () => {
    const jpegData = createMockJpeg(100, 100);

    parseFileSpy.mockResolvedValue({
      common: {
        picture: [
          {
            format: 'image/jpeg',
            data: new Uint8Array(jpegData),
            type: 'Cover (front)',
          },
        ],
      },
      format: {},
    } as mm.IAudioMetadata);

    const tempPath = await extractAndSaveArtwork('/path/to/song.flac');

    expect(tempPath).not.toBeNull();
    expect(tempPath).toContain('.jpg');

    // Verify file exists and has expected length
    const content = await readFile(tempPath!);
    expect(content.length).toBe(jpegData.length);
  });

  it('returns null when no artwork found', async () => {
    parseFileSpy.mockResolvedValue({
      common: {},
      format: {},
    } as mm.IAudioMetadata);

    const tempPath = await extractAndSaveArtwork('/path/to/song.mp3');

    expect(tempPath).toBeNull();
  });
});

// ============================================================================
// Helper functions to create mock image data
// ============================================================================

/**
 * Create a minimal mock JPEG buffer with specified dimensions.
 * This creates just enough structure for dimension detection to work.
 */
function createMockJpeg(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(20);

  // SOI marker (Start of Image)
  buffer[0] = 0xff;
  buffer[1] = 0xd8;

  // SOF0 marker (Start of Frame, baseline DCT)
  buffer[2] = 0xff;
  buffer[3] = 0xc0;

  // Length (high byte, low byte) - 17 bytes for SOF0 segment
  buffer[4] = 0x00;
  buffer[5] = 0x11;

  // Precision (8 bits)
  buffer[6] = 0x08;

  // Height (16-bit big-endian)
  buffer.writeUInt16BE(height, 7);

  // Width (16-bit big-endian)
  buffer.writeUInt16BE(width, 9);

  // Number of components
  buffer[11] = 0x03;

  // Component data (3 bytes per component, 3 components = 9 bytes)
  // Just fill with zeros, we don't need valid component data
  buffer.fill(0, 12, 20);

  return buffer;
}

/**
 * Create a minimal mock PNG buffer with specified dimensions.
 * This creates the PNG signature and IHDR chunk.
 */
function createMockPng(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33);

  // PNG signature
  buffer[0] = 0x89;
  buffer[1] = 0x50; // P
  buffer[2] = 0x4e; // N
  buffer[3] = 0x47; // G
  buffer[4] = 0x0d;
  buffer[5] = 0x0a;
  buffer[6] = 0x1a;
  buffer[7] = 0x0a;

  // IHDR chunk
  // Length (4 bytes) - 13 bytes of data
  buffer.writeUInt32BE(13, 8);

  // Chunk type: 'IHDR'
  buffer[12] = 0x49; // I
  buffer[13] = 0x48; // H
  buffer[14] = 0x44; // D
  buffer[15] = 0x52; // R

  // Width (4 bytes, big-endian)
  buffer.writeUInt32BE(width, 16);

  // Height (4 bytes, big-endian)
  buffer.writeUInt32BE(height, 20);

  // Bit depth (1 byte)
  buffer[24] = 0x08;

  // Color type (1 byte) - 2 = truecolor
  buffer[25] = 0x02;

  // Compression (1 byte)
  buffer[26] = 0x00;

  // Filter (1 byte)
  buffer[27] = 0x00;

  // Interlace (1 byte)
  buffer[28] = 0x00;

  // CRC (4 bytes) - just fill with zeros, we don't validate it
  buffer.fill(0, 29, 33);

  return buffer;
}
