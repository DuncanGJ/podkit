/**
 * Tests for metadata extraction utilities
 */

import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { getFileDisplayMetadata, getFilesDisplayMetadata } from './extractor.js';

// Find fixtures path by searching up from cwd or using known locations
function findFixturesPath(): string {
  const candidates = [
    // From monorepo root (most common case)
    join(process.cwd(), 'test/fixtures/audio'),
    // From package directory
    join(process.cwd(), '../../test/fixtures/audio'),
    // Relative to this file's source location
    join(import.meta.dir, '../../../../test/fixtures/audio'),
  ];

  for (const candidate of candidates) {
    const testFile = join(candidate, 'goldberg-selections/01-harmony.flac');
    if (existsSync(testFile)) {
      return candidate;
    }
  }

  // Return first candidate as fallback (tests will skip if invalid)
  return candidates[0]!;
}

const FIXTURES_PATH = findFixturesPath();

// Skip tests if fixtures not available (CI without test data)
const hasFixtures = existsSync(join(FIXTURES_PATH, 'goldberg-selections/01-harmony.flac'));

describe.skipIf(!hasFixtures)('getFileDisplayMetadata', () => {
  it('extracts artwork and bitrate from FLAC file with artwork', async () => {
    const filePath = join(FIXTURES_PATH, 'goldberg-selections/01-harmony.flac');
    const metadata = await getFileDisplayMetadata(filePath);

    expect(metadata.hasArtwork).toBe(true);
    expect(metadata.bitrate).toBeGreaterThan(0);
    expect(typeof metadata.bitrate).toBe('number');
  });

  it('returns hasArtwork=false for file without artwork', async () => {
    const filePath = join(FIXTURES_PATH, 'synthetic-tests/03-dual-tone.flac');
    const metadata = await getFileDisplayMetadata(filePath);

    expect(metadata.hasArtwork).toBe(false);
    expect(metadata.bitrate).toBeGreaterThan(0);
  });

  it('returns defaults for non-existent file', async () => {
    const filePath = '/non/existent/file.flac';
    const metadata = await getFileDisplayMetadata(filePath);

    expect(metadata.hasArtwork).toBe(false);
    expect(metadata.bitrate).toBeUndefined();
  });

  it('returns bitrate in kbps (not bps)', async () => {
    const filePath = join(FIXTURES_PATH, 'goldberg-selections/01-harmony.flac');
    const metadata = await getFileDisplayMetadata(filePath);

    // Bitrate should be in reasonable kbps range (not raw bps)
    // FLAC files typically have bitrates between 50-1500 kbps
    expect(metadata.bitrate).toBeGreaterThan(50);
    expect(metadata.bitrate).toBeLessThan(2000);
  });
});

describe.skipIf(!hasFixtures)('getFilesDisplayMetadata', () => {
  it('extracts metadata from multiple files in parallel', async () => {
    const filePaths = [
      join(FIXTURES_PATH, 'goldberg-selections/01-harmony.flac'),
      join(FIXTURES_PATH, 'goldberg-selections/02-vibrato.flac'),
      join(FIXTURES_PATH, 'synthetic-tests/03-dual-tone.flac'),
    ];

    const metadataMap = await getFilesDisplayMetadata(filePaths);

    expect(metadataMap.size).toBe(3);

    // Files with artwork
    const harmony = metadataMap.get(filePaths[0]!);
    expect(harmony?.hasArtwork).toBe(true);
    expect(harmony?.bitrate).toBeGreaterThan(0);

    const vibrato = metadataMap.get(filePaths[1]!);
    expect(vibrato?.hasArtwork).toBe(true);
    expect(vibrato?.bitrate).toBeGreaterThan(0);

    // File without artwork
    const dualTone = metadataMap.get(filePaths[2]!);
    expect(dualTone?.hasArtwork).toBe(false);
    expect(dualTone?.bitrate).toBeGreaterThan(0);
  });

  it('returns empty map for empty input', async () => {
    const metadataMap = await getFilesDisplayMetadata([]);
    expect(metadataMap.size).toBe(0);
  });

  it('handles mix of valid and invalid files gracefully', async () => {
    const filePaths = [
      join(FIXTURES_PATH, 'goldberg-selections/01-harmony.flac'),
      '/non/existent/file.flac',
    ];

    const metadataMap = await getFilesDisplayMetadata(filePaths);

    expect(metadataMap.size).toBe(2);

    // Valid file
    const harmony = metadataMap.get(filePaths[0]!);
    expect(harmony?.hasArtwork).toBe(true);

    // Invalid file returns defaults
    const invalid = metadataMap.get(filePaths[1]!);
    expect(invalid?.hasArtwork).toBe(false);
    expect(invalid?.bitrate).toBeUndefined();
  });
});
