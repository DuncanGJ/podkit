/**
 * Tests for artwork integrity checker
 *
 * checkIntegrity() examines a parsed ArtworkDB for anomalies:
 *   - Out-of-bounds .ithmb offsets
 *   - Misaligned offsets (not on slot boundaries)
 *   - Duplicate offsets within same format/file
 *   - Duplicate MHII image IDs
 */

import { afterAll, describe, expect, it } from 'bun:test';
import { rmSync } from 'node:fs';
import type { ArtworkDB, MHIIEntry, MHNIEntry } from './artworkdb-parser.js';
import { checkIntegrity } from './integrity.js';
import type { Anomaly, IntegrityReport } from './integrity.js';
import { createTestIpod } from './__tests__/test-ipod-helpers.js';

// ── Data builders ───────────────────────────────────────────────────────────

function makeMHNI(opts?: Partial<MHNIEntry>): MHNIEntry {
  return {
    formatId: 1028,
    itmbOffset: 0,
    imageSize: 20000,
    width: 100,
    height: 100,
    verticalPadding: 0,
    horizontalPadding: 0,
    filename: ':F1028_1.ithmb',
    ...opts,
  };
}

function makeMHII(opts?: Partial<MHIIEntry>): MHIIEntry {
  return {
    imageId: 1,
    songId: 1n,
    rating: 0,
    origImgSize: 0,
    thumbnails: [],
    ...opts,
  };
}

function makeArtworkDB(opts?: Partial<ArtworkDB>): ArtworkDB {
  return {
    nextId: 1,
    images: [],
    formats: [],
    ...opts,
  };
}

// ── Track temp dirs for cleanup ─────────────────────────────────────────────

const tempDirs: string[] = [];

function trackIpod(itmbFiles: Record<string, number>): string {
  const path = createTestIpod(itmbFiles);
  tempDirs.push(path);
  return path;
}

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Helper to filter anomalies by type ──────────────────────────────────────

function anomaliesOfType(report: IntegrityReport, type: Anomaly['type']): Anomaly[] {
  return report.anomalies.filter((a) => a.type === type);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('checkIntegrity', () => {
  describe('healthy database', () => {
    it('reports zero anomalies when all offsets are within bounds', () => {
      // F1028_1.ithmb with 3 slots of 20,000 bytes = 60,000 bytes
      const ipod = trackIpod({ 'F1028_1.ithmb': 60000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })],
          }),
          makeMHII({
            imageId: 2,
            songId: 200n,
            thumbnails: [makeMHNI({ itmbOffset: 20000 })],
          }),
          makeMHII({
            imageId: 3,
            songId: 300n,
            thumbnails: [makeMHNI({ itmbOffset: 40000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.anomalyCount).toBe(0);
      expect(report.summary.outOfBoundsCount).toBe(0);
      expect(report.summary.totalMHII).toBe(3);
      expect(report.summary.totalMHNI).toBe(3);
      expect(report.anomalies).toHaveLength(0);
    });

    it('populates format summaries correctly', () => {
      const ipod = trackIpod({
        'F1028_1.ithmb': 60000,
        'F1029_1.ithmb': 240000,
      });
      const db = makeArtworkDB({
        formats: [
          { formatId: 1028, imageSize: 20000 },
          { formatId: 1029, imageSize: 80000 },
        ],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [
              makeMHNI({ formatId: 1028, itmbOffset: 0, filename: ':F1028_1.ithmb' }),
              makeMHNI({
                formatId: 1029,
                itmbOffset: 0,
                imageSize: 80000,
                filename: ':F1029_1.ithmb',
              }),
            ],
          }),
          makeMHII({
            imageId: 2,
            songId: 200n,
            thumbnails: [
              makeMHNI({ formatId: 1028, itmbOffset: 20000, filename: ':F1028_1.ithmb' }),
              makeMHNI({
                formatId: 1029,
                itmbOffset: 80000,
                imageSize: 80000,
                filename: ':F1029_1.ithmb',
              }),
            ],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.formats).toHaveLength(2);

      // Formats are sorted by formatId
      const fmt1028 = report.summary.formats.find((f) => f.formatId === 1028)!;
      expect(fmt1028.slotSize).toBe(20000);
      expect(fmt1028.fileSize).toBe(60000);
      expect(fmt1028.totalEntries).toBe(2);
      expect(fmt1028.outOfBoundsEntries).toBe(0);

      const fmt1029 = report.summary.formats.find((f) => f.formatId === 1029)!;
      expect(fmt1029.slotSize).toBe(80000);
      expect(fmt1029.fileSize).toBe(240000);
      expect(fmt1029.totalEntries).toBe(2);
      expect(fmt1029.outOfBoundsEntries).toBe(0);
    });
  });

  describe('out-of-bounds detection', () => {
    it('detects offset beyond file size', () => {
      // File has 1 slot (20,000 bytes), but offset points to second slot
      const ipod = trackIpod({ 'F1028_1.ithmb': 20000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 40000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.outOfBoundsCount).toBe(1);
      const oob = anomaliesOfType(report, 'out-of-bounds');
      expect(oob).toHaveLength(1);
      expect(oob[0]!.severity).toBe('error');
      expect(oob[0]!.details.offset).toBe(40000);
      expect(oob[0]!.details.fileSize).toBe(20000);
    });

    it('counts mixed in-bounds and out-of-bounds entries correctly', () => {
      // File has 5 slots (100,000 bytes), 3 in-bounds + 2 OOB
      const ipod = trackIpod({ 'F1028_1.ithmb': 100000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 1n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })],
          }),
          makeMHII({
            imageId: 2,
            songId: 2n,
            thumbnails: [makeMHNI({ itmbOffset: 20000 })],
          }),
          makeMHII({
            imageId: 3,
            songId: 3n,
            thumbnails: [makeMHNI({ itmbOffset: 40000 })],
          }),
          makeMHII({
            imageId: 4,
            songId: 4n,
            thumbnails: [makeMHNI({ itmbOffset: 120000 })],
          }),
          makeMHII({
            imageId: 5,
            songId: 5n,
            thumbnails: [makeMHNI({ itmbOffset: 200000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.outOfBoundsCount).toBe(2);
      expect(report.summary.totalMHII).toBe(5);

      const oob = anomaliesOfType(report, 'out-of-bounds');
      expect(oob).toHaveLength(2);

      const fmt = report.summary.formats.find((f) => f.formatId === 1028)!;
      expect(fmt.totalEntries).toBe(5);
      expect(fmt.outOfBoundsEntries).toBe(2);
    });

    it('reports missing ithmb file as out-of-bounds', () => {
      // No ithmb files at all — the reference points to a non-existent file
      const ipod = trackIpod({});
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.outOfBoundsCount).toBe(1);
      const oob = anomaliesOfType(report, 'out-of-bounds');
      expect(oob).toHaveLength(1);
      expect(oob[0]!.description).toContain('Missing');
      expect(oob[0]!.details.filename).toBe(':F1028_1.ithmb');
    });

    it('detects out-of-bounds when offset + imageSize exceeds file size', () => {
      // File is 30,000 bytes, offset 20,000 + imageSize 20,000 = 40,000 > 30,000
      const ipod = trackIpod({ 'F1028_1.ithmb': 30000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 20000, imageSize: 20000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.outOfBoundsCount).toBe(1);
      const oob = anomaliesOfType(report, 'out-of-bounds');
      expect(oob).toHaveLength(1);
      expect(oob[0]!.description).toContain('exceeds');
    });
  });

  describe('misalignment detection', () => {
    it('reports misaligned offset as a warning', () => {
      // Slot size is 20,000, offset 10,000 is not aligned
      const ipod = trackIpod({ 'F1028_1.ithmb': 60000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 10000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      const misaligned = anomaliesOfType(report, 'misaligned');
      expect(misaligned).toHaveLength(1);
      expect(misaligned[0]!.severity).toBe('warning');
      expect(misaligned[0]!.details.offset).toBe(10000);
      expect(misaligned[0]!.details.slotSize).toBe(20000);
    });

    it('does not report misalignment for properly aligned offset', () => {
      const ipod = trackIpod({ 'F1028_1.ithmb': 60000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 20000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      const misaligned = anomaliesOfType(report, 'misaligned');
      expect(misaligned).toHaveLength(0);
    });

    it('treats offset 0 as aligned', () => {
      const ipod = trackIpod({ 'F1028_1.ithmb': 60000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      const misaligned = anomaliesOfType(report, 'misaligned');
      expect(misaligned).toHaveLength(0);
    });
  });

  describe('duplicate detection', () => {
    it('detects two MHII entries pointing to the same format/file/offset', () => {
      const ipod = trackIpod({ 'F1028_1.ithmb': 60000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })],
          }),
          makeMHII({
            imageId: 2,
            songId: 200n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })], // same offset
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      const dupes = anomaliesOfType(report, 'duplicate-offset');
      expect(dupes).toHaveLength(1);
      expect(dupes[0]!.severity).toBe('error');
      expect(dupes[0]!.details.imageId1).toBe(1);
      expect(dupes[0]!.details.imageId2).toBe(2);
      expect(dupes[0]!.details.offset).toBe(0);
    });

    it('does not flag different offsets in same file as duplicates', () => {
      const ipod = trackIpod({ 'F1028_1.ithmb': 60000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })],
          }),
          makeMHII({
            imageId: 2,
            songId: 200n,
            thumbnails: [makeMHNI({ itmbOffset: 20000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      const dupes = anomaliesOfType(report, 'duplicate-offset');
      expect(dupes).toHaveLength(0);
    });

    it('detects duplicate MHII image IDs', () => {
      const ipod = trackIpod({ 'F1028_1.ithmb': 60000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 42,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })],
          }),
          makeMHII({
            imageId: 42, // duplicate ID
            songId: 200n,
            thumbnails: [makeMHNI({ itmbOffset: 20000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      const dupeIds = anomaliesOfType(report, 'duplicate-id');
      expect(dupeIds).toHaveLength(1);
      expect(dupeIds[0]!.severity).toBe('error');
      expect(dupeIds[0]!.description).toContain('42');
      expect(dupeIds[0]!.details.imageId).toBe(42);
    });

    it('reports duplicate-id only once even when ID appears 3+ times', () => {
      const ipod = trackIpod({ 'F1028_1.ithmb': 80000 });
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({ imageId: 7, songId: 1n, thumbnails: [makeMHNI({ itmbOffset: 0 })] }),
          makeMHII({ imageId: 7, songId: 2n, thumbnails: [makeMHNI({ itmbOffset: 20000 })] }),
          makeMHII({ imageId: 7, songId: 3n, thumbnails: [makeMHNI({ itmbOffset: 40000 })] }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      // The code fires the anomaly when idCount === 2 (i.e., on the second occurrence only)
      const dupeIds = anomaliesOfType(report, 'duplicate-id');
      expect(dupeIds).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty images array with no anomalies', () => {
      const ipod = trackIpod({});
      const db = makeArtworkDB({ images: [] });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.totalMHII).toBe(0);
      expect(report.summary.totalMHNI).toBe(0);
      expect(report.summary.anomalyCount).toBe(0);
      expect(report.summary.formats).toHaveLength(0);
      expect(report.anomalies).toHaveLength(0);
    });

    it('handles MHII with no thumbnails (only duplicate-id check runs)', () => {
      const ipod = trackIpod({});
      const db = makeArtworkDB({
        images: [
          makeMHII({ imageId: 1, songId: 100n, thumbnails: [] }),
          makeMHII({ imageId: 2, songId: 200n, thumbnails: [] }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.totalMHII).toBe(2);
      expect(report.summary.totalMHNI).toBe(0);
      expect(report.summary.anomalyCount).toBe(0);
      expect(report.summary.formats).toHaveLength(0);
    });

    it('uses default slot sizes when no MHIF formats are provided', () => {
      // Default for 1028 is 20,000 — offset 10,000 should trigger misalignment
      const ipod = trackIpod({ 'F1028_1.ithmb': 60000 });
      const db = makeArtworkDB({
        formats: [], // no MHIF entries
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 10000 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      const misaligned = anomaliesOfType(report, 'misaligned');
      expect(misaligned).toHaveLength(1);
      expect(misaligned[0]!.details.slotSize).toBe(20000);
    });

    it('handles multiple formats across different ithmb files', () => {
      const ipod = trackIpod({
        'F1028_1.ithmb': 40000,
        'F1029_1.ithmb': 160000,
      });
      const db = makeArtworkDB({
        formats: [
          { formatId: 1028, imageSize: 20000 },
          { formatId: 1029, imageSize: 80000 },
        ],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [
              makeMHNI({ formatId: 1028, itmbOffset: 0, filename: ':F1028_1.ithmb' }),
              makeMHNI({
                formatId: 1029,
                itmbOffset: 0,
                imageSize: 80000,
                filename: ':F1029_1.ithmb',
              }),
            ],
          }),
          makeMHII({
            imageId: 2,
            songId: 200n,
            thumbnails: [
              makeMHNI({ formatId: 1028, itmbOffset: 20000, filename: ':F1028_1.ithmb' }),
              makeMHNI({
                formatId: 1029,
                itmbOffset: 80000,
                imageSize: 80000,
                filename: ':F1029_1.ithmb',
              }),
            ],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.anomalyCount).toBe(0);
      expect(report.summary.totalMHNI).toBe(4);
      expect(report.summary.formats).toHaveLength(2);
    });
  });

  describe('format summaries', () => {
    it('reports correct fileSize of -1 when ithmb file is missing', () => {
      const ipod = trackIpod({});
      const db = makeArtworkDB({
        formats: [{ formatId: 1028, imageSize: 20000 }],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [makeMHNI({ itmbOffset: 0 })],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      const fmt = report.summary.formats.find((f) => f.formatId === 1028)!;
      expect(fmt.fileSize).toBe(-1);
      expect(fmt.outOfBoundsEntries).toBe(1);
    });

    it('sorts format summaries by formatId', () => {
      const ipod = trackIpod({
        'F1029_1.ithmb': 160000,
        'F1028_1.ithmb': 40000,
      });
      const db = makeArtworkDB({
        formats: [
          { formatId: 1029, imageSize: 80000 },
          { formatId: 1028, imageSize: 20000 },
        ],
        images: [
          makeMHII({
            imageId: 1,
            songId: 100n,
            thumbnails: [
              makeMHNI({
                formatId: 1029,
                itmbOffset: 0,
                imageSize: 80000,
                filename: ':F1029_1.ithmb',
              }),
              makeMHNI({ formatId: 1028, itmbOffset: 0, filename: ':F1028_1.ithmb' }),
            ],
          }),
        ],
      });

      const report = checkIntegrity(db, ipod);

      expect(report.summary.formats[0]!.formatId).toBe(1028);
      expect(report.summary.formats[1]!.formatId).toBe(1029);
    });
  });

  describe('realistic multi-image fixture', () => {
    // Builds a 20-image, 2-format database with matching ithmb files
    // to verify integrity checking at scale with aligned, healthy data.
    const IMAGE_COUNT = 20;

    function buildRealisticDb(): ArtworkDB {
      const images: MHIIEntry[] = [];
      for (let i = 0; i < IMAGE_COUNT; i++) {
        images.push(
          makeMHII({
            imageId: 100 + i,
            songId: BigInt((100 + i) * 10),
            thumbnails: [
              makeMHNI({
                formatId: 1028,
                itmbOffset: i * 20000,
                imageSize: 20000,
                filename: ':F1028_1.ithmb',
              }),
              makeMHNI({
                formatId: 1029,
                itmbOffset: i * 80000,
                imageSize: 80000,
                width: 200,
                height: 200,
                filename: ':F1029_1.ithmb',
              }),
            ],
          })
        );
      }
      return makeArtworkDB({
        formats: [
          { formatId: 1028, imageSize: 20000 },
          { formatId: 1029, imageSize: 80000 },
        ],
        images,
      });
    }

    it('reports no anomalies for properly sized ithmb files', () => {
      const ipod = trackIpod({
        'F1028_1.ithmb': IMAGE_COUNT * 20000,
        'F1029_1.ithmb': IMAGE_COUNT * 80000,
      });
      const db = buildRealisticDb();
      const report = checkIntegrity(db, ipod);

      expect(report.summary.anomalyCount).toBe(0);
      expect(report.summary.totalMHII).toBe(IMAGE_COUNT);
      expect(report.summary.totalMHNI).toBe(IMAGE_COUNT * 2);
      expect(anomaliesOfType(report, 'misaligned')).toHaveLength(0);
    });

    it('format summaries show correct file sizes and slot sizes', () => {
      const ipod = trackIpod({
        'F1028_1.ithmb': IMAGE_COUNT * 20000,
        'F1029_1.ithmb': IMAGE_COUNT * 80000,
      });
      const db = buildRealisticDb();
      const report = checkIntegrity(db, ipod);

      for (const fmt of report.summary.formats) {
        expect(fmt.fileSize).toBeGreaterThan(0);
        expect(fmt.slotSize).toBeGreaterThan(0);
        expect(fmt.totalEntries).toBe(IMAGE_COUNT);
        expect(fmt.outOfBoundsEntries).toBe(0);
      }
    });

    it('detects corruption when ithmb files are truncated', () => {
      // Truncate both files to half — later entries become out-of-bounds
      const ipod = trackIpod({
        'F1028_1.ithmb': (IMAGE_COUNT * 20000) / 2,
        'F1029_1.ithmb': (IMAGE_COUNT * 80000) / 2,
      });
      const db = buildRealisticDb();
      const report = checkIntegrity(db, ipod);

      expect(report.summary.outOfBoundsCount).toBeGreaterThan(0);
      // First half of entries should be valid, second half out-of-bounds
      expect(report.summary.outOfBoundsCount).toBe(IMAGE_COUNT); // 10 per format
      expect(anomaliesOfType(report, 'misaligned')).toHaveLength(0);
    });
  });
});
