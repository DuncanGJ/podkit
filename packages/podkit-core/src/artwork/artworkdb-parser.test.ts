/**
 * Tests for ArtworkDB binary parser
 *
 * Uses hand-built binary buffers to verify the parser correctly reads
 * iPod ArtworkDB structures. The builder module constructs valid byte
 * sequences matching the iPod's little-endian binary format.
 */

import { describe, it, expect } from 'bun:test';
import { parseArtworkDB } from './artworkdb-parser.js';
import {
  buildArtworkDB,
  buildMHSD,
  buildMHLI,
  buildMHLF,
  buildMHII,
  buildMHIF,
  buildThumbnail,
} from './__tests__/artworkdb-builder.js';

// ── Hand-built binary buffer tests ──────────────────────────────────────────

describe('parseArtworkDB', () => {
  describe('minimal valid databases', () => {
    it('parses a DB with 1 image, 1 thumbnail, 1 format', () => {
      const thumb = buildThumbnail({
        formatId: 1028,
        offset: 0,
        imageSize: 20000,
        width: 100,
        height: 100,
        filename: ':F1028_1.ithmb',
      });

      const mhii = buildMHII({
        imageId: 100,
        songId: 42n,
        rating: 80,
        origImgSize: 50000,
        thumbnails: [thumb],
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([mhii]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([buildMHIF({ formatId: 1028, imageSize: 20000 })]),
      });

      const db = buildArtworkDB({
        nextId: 101,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.nextId).toBe(101);
      expect(result.images).toHaveLength(1);
      expect(result.formats).toHaveLength(1);

      const image = result.images[0]!;
      expect(image.imageId).toBe(100);
      expect(image.songId).toBe(42n);
      expect(image.rating).toBe(80);
      expect(image.origImgSize).toBe(50000);
      expect(image.thumbnails).toHaveLength(1);

      const thumbnail = image.thumbnails[0]!;
      expect(thumbnail.formatId).toBe(1028);
      expect(thumbnail.itmbOffset).toBe(0);
      expect(thumbnail.imageSize).toBe(20000);
      expect(thumbnail.width).toBe(100);
      expect(thumbnail.height).toBe(100);
      expect(thumbnail.verticalPadding).toBe(0);
      expect(thumbnail.horizontalPadding).toBe(0);
      expect(thumbnail.filename).toBe(':F1028_1.ithmb');

      const format = result.formats[0]!;
      expect(format.formatId).toBe(1028);
      expect(format.imageSize).toBe(20000);
    });

    it('parses a DB with 2 images, each with 2 thumbnails', () => {
      const makeImage = (id: number, songId: bigint) => {
        const thumb1028 = buildThumbnail({
          formatId: 1028,
          offset: id * 20000,
          imageSize: 20000,
          width: 100,
          height: 100,
          filename: ':F1028_1.ithmb',
        });

        const thumb1029 = buildThumbnail({
          formatId: 1029,
          offset: id * 80000,
          imageSize: 80000,
          width: 200,
          height: 200,
          filename: ':F1029_1.ithmb',
        });

        return buildMHII({
          imageId: id,
          songId,
          thumbnails: [thumb1028, thumb1029],
        });
      };

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([makeImage(100, 1000n), makeImage(101, 1001n)]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([
          buildMHIF({ formatId: 1028, imageSize: 20000 }),
          buildMHIF({ formatId: 1029, imageSize: 80000 }),
        ]),
      });

      const db = buildArtworkDB({
        nextId: 102,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.nextId).toBe(102);
      expect(result.images).toHaveLength(2);
      expect(result.formats).toHaveLength(2);

      // First image
      expect(result.images[0]!.imageId).toBe(100);
      expect(result.images[0]!.songId).toBe(1000n);
      expect(result.images[0]!.thumbnails).toHaveLength(2);
      expect(result.images[0]!.thumbnails[0]!.formatId).toBe(1028);
      expect(result.images[0]!.thumbnails[0]!.width).toBe(100);
      expect(result.images[0]!.thumbnails[1]!.formatId).toBe(1029);
      expect(result.images[0]!.thumbnails[1]!.width).toBe(200);

      // Second image
      expect(result.images[1]!.imageId).toBe(101);
      expect(result.images[1]!.songId).toBe(1001n);
      expect(result.images[1]!.thumbnails).toHaveLength(2);

      // Formats
      expect(result.formats[0]!.formatId).toBe(1028);
      expect(result.formats[0]!.imageSize).toBe(20000);
      expect(result.formats[1]!.formatId).toBe(1029);
      expect(result.formats[1]!.imageSize).toBe(80000);
    });

    it('parses a DB with 0 images', () => {
      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([buildMHIF({ formatId: 1028, imageSize: 20000 })]),
      });

      const db = buildArtworkDB({
        nextId: 100,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.nextId).toBe(100);
      expect(result.images).toHaveLength(0);
      expect(result.formats).toHaveLength(1);
    });

    it('parses an image with 0 thumbnails', () => {
      const mhii = buildMHII({
        imageId: 50,
        songId: 999n,
        thumbnails: [],
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([mhii]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([]),
      });

      const db = buildArtworkDB({
        nextId: 51,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.images).toHaveLength(1);
      expect(result.images[0]!.imageId).toBe(50);
      expect(result.images[0]!.songId).toBe(999n);
      expect(result.images[0]!.thumbnails).toHaveLength(0);
      expect(result.formats).toHaveLength(0);
    });
  });

  describe('field precision', () => {
    it('reads bigint songId correctly for large 64-bit values', () => {
      // Use a value that exceeds Number.MAX_SAFE_INTEGER (2^53 - 1)
      const largeSongId = 0x00ffeeddccbbaa99n;

      const mhii = buildMHII({
        imageId: 1,
        songId: largeSongId,
        thumbnails: [],
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([mhii]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([]),
      });

      const db = buildArtworkDB({
        nextId: 2,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.images[0]!.songId).toBe(largeSongId);
    });

    it('reads vertical and horizontal padding values', () => {
      const thumb = buildThumbnail({
        formatId: 1028,
        offset: 0,
        imageSize: 20000,
        width: 100,
        height: 100,
        verticalPadding: -3,
        horizontalPadding: 5,
        filename: ':F1028_1.ithmb',
      });

      const mhii = buildMHII({
        imageId: 1,
        songId: 1n,
        thumbnails: [thumb],
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([mhii]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([]),
      });

      const db = buildArtworkDB({
        nextId: 2,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);
      const thumbnail = result.images[0]!.thumbnails[0]!;

      expect(thumbnail.verticalPadding).toBe(-3);
      expect(thumbnail.horizontalPadding).toBe(5);
    });

    it('reads ithmb offset correctly for non-zero values', () => {
      const thumb = buildThumbnail({
        formatId: 1029,
        offset: 320000,
        imageSize: 80000,
        width: 200,
        height: 200,
        filename: ':F1029_1.ithmb',
      });

      const mhii = buildMHII({
        imageId: 5,
        songId: 5n,
        thumbnails: [thumb],
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([mhii]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([]),
      });

      const db = buildArtworkDB({
        nextId: 6,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.images[0]!.thumbnails[0]!.itmbOffset).toBe(320000);
    });
  });

  describe('string encoding', () => {
    it('decodes UTF-16LE filename when encoding byte is 2', () => {
      const thumb = buildThumbnail({
        formatId: 1028,
        offset: 0,
        imageSize: 20000,
        width: 100,
        height: 100,
        filename: ':F1028_1.ithmb',
        filenameEncoding: 2,
      });

      const mhii = buildMHII({
        imageId: 1,
        songId: 1n,
        thumbnails: [thumb],
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([mhii]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([]),
      });

      const db = buildArtworkDB({
        nextId: 2,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.images[0]!.thumbnails[0]!.filename).toBe(':F1028_1.ithmb');
    });

    it('decodes UTF-8 filename when encoding byte is 1', () => {
      const thumb = buildThumbnail({
        formatId: 1029,
        offset: 0,
        imageSize: 80000,
        width: 200,
        height: 200,
        filename: ':F1029_1.ithmb',
        filenameEncoding: 1,
      });

      const mhii = buildMHII({
        imageId: 1,
        songId: 1n,
        thumbnails: [thumb],
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([mhii]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([]),
      });

      const db = buildArtworkDB({
        nextId: 2,
        sections: [imageSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.images[0]!.thumbnails[0]!.filename).toBe(':F1029_1.ithmb');
    });
  });

  // ── Error handling tests ────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws on truncated buffer (too short for MHFD header)', () => {
      const buf = Buffer.alloc(10);
      buf.write('mhfd', 0, 4, 'ascii');

      expect(() => parseArtworkDB(buf)).toThrow();
    });

    it('throws with descriptive message on wrong magic at offset 0', () => {
      const buf = Buffer.alloc(100);
      buf.write('XXXX', 0, 4, 'ascii');

      expect(() => parseArtworkDB(buf)).toThrow(/Expected magic "mhfd" at offset 0x0, got "XXXX"/);
    });

    it('throws on wrong magic in MHSD section', () => {
      // Build a valid MHFD header that points to a bad section
      const headerLen = 84;
      const buf = Buffer.alloc(headerLen + 20);

      buf.write('mhfd', 0, 4, 'ascii');
      buf.writeUInt32LE(headerLen, 4); // header_len
      buf.writeUInt32LE(buf.length, 8); // total_len
      buf.writeUInt32LE(1, 20); // num_children = 1
      buf.writeUInt32LE(100, 28); // next_id

      // Write bad magic where MHSD is expected
      buf.write('ZZZZ', headerLen, 4, 'ascii');

      expect(() => parseArtworkDB(buf)).toThrow(/Expected magic "mhsd".*got "ZZZZ"/);
    });

    it('throws on wrong magic in MHLI (image list)', () => {
      // Build an MHFD + MHSD(index=1) that contains bad inner magic
      const mhfdHeaderLen = 84;
      const mhsdHeaderLen = 16;
      const totalSize = mhfdHeaderLen + mhsdHeaderLen + 20;
      const buf = Buffer.alloc(totalSize);

      buf.write('mhfd', 0, 4, 'ascii');
      buf.writeUInt32LE(mhfdHeaderLen, 4);
      buf.writeUInt32LE(totalSize, 8);
      buf.writeUInt32LE(1, 20); // 1 section
      buf.writeUInt32LE(100, 28);

      // MHSD at offset 84
      const mhsdOffset = mhfdHeaderLen;
      buf.write('mhsd', mhsdOffset, 4, 'ascii');
      buf.writeUInt32LE(mhsdHeaderLen, mhsdOffset + 4);
      buf.writeUInt32LE(mhsdHeaderLen + 20, mhsdOffset + 8);
      buf.writeUInt16LE(1, mhsdOffset + 12); // section index 1 (image list)

      // Bad magic where MHLI should be
      const mhliOffset = mhsdOffset + mhsdHeaderLen;
      buf.write('BAAD', mhliOffset, 4, 'ascii');

      expect(() => parseArtworkDB(buf)).toThrow(/Expected magic "mhli".*got "BAAD"/);
    });

    it('throws on empty buffer', () => {
      expect(() => parseArtworkDB(Buffer.alloc(0))).toThrow();
    });
  });

  // ── Section ordering tests ────────────────────────────────────────────────

  describe('section ordering', () => {
    it('handles format section (index=3) before image section (index=1)', () => {
      const thumb = buildThumbnail({
        formatId: 1028,
        offset: 0,
        imageSize: 20000,
        width: 100,
        height: 100,
        filename: ':F1028_1.ithmb',
      });

      const mhii = buildMHII({
        imageId: 1,
        songId: 1n,
        thumbnails: [thumb],
      });

      // Format section first, then image section
      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([buildMHIF({ formatId: 1028, imageSize: 20000 })]),
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([mhii]),
      });

      const db = buildArtworkDB({
        nextId: 2,
        sections: [formatSection, imageSection],
      });

      const result = parseArtworkDB(db);

      expect(result.images).toHaveLength(1);
      expect(result.formats).toHaveLength(1);
      expect(result.images[0]!.imageId).toBe(1);
      expect(result.formats[0]!.formatId).toBe(1028);
    });

    it('skips unknown section indexes gracefully', () => {
      // Section index 2 (album list) should be skipped
      const albumSection = buildMHSD({
        sectionIndex: 2,
        contentBuffer: Buffer.alloc(12), // dummy content
      });

      const imageSection = buildMHSD({
        sectionIndex: 1,
        contentBuffer: buildMHLI([]),
      });

      const formatSection = buildMHSD({
        sectionIndex: 3,
        contentBuffer: buildMHLF([]),
      });

      const db = buildArtworkDB({
        nextId: 1,
        sections: [imageSection, albumSection, formatSection],
      });

      const result = parseArtworkDB(db);

      expect(result.images).toHaveLength(0);
      expect(result.formats).toHaveLength(0);
    });
  });
});

// ── Realistic multi-image database ───────────────────────────────────────────
//
// Replicates the structure of a real iPod ArtworkDB: many images, 2 formats
// (1028 small + 1029 large), sequential IDs starting at 100, 2 thumbnails per
// image. Built entirely from the in-repo builder so no external files needed.

describe('parseArtworkDB (realistic fixture)', () => {
  const IMAGE_COUNT = 50;

  function buildRealisticDb() {
    const images: Buffer[] = [];
    for (let i = 0; i < IMAGE_COUNT; i++) {
      const id = 100 + i;
      const thumb1028 = buildThumbnail({
        formatId: 1028,
        offset: i * 20000,
        imageSize: 20000,
        width: 100,
        height: 100,
        filename: ':F1028_1.ithmb',
      });
      const thumb1029 = buildThumbnail({
        formatId: 1029,
        offset: i * 80000,
        imageSize: 80000,
        width: 200,
        height: 200,
        filename: ':F1029_1.ithmb',
      });
      images.push(
        buildMHII({
          imageId: id,
          songId: BigInt(id * 10),
          thumbnails: [thumb1028, thumb1029],
        })
      );
    }

    const imageSection = buildMHSD({
      sectionIndex: 1,
      contentBuffer: buildMHLI(images),
    });
    const formatSection = buildMHSD({
      sectionIndex: 3,
      contentBuffer: buildMHLF([
        buildMHIF({ formatId: 1028, imageSize: 20000 }),
        buildMHIF({ formatId: 1029, imageSize: 80000 }),
      ]),
    });

    return buildArtworkDB({
      nextId: 100 + IMAGE_COUNT,
      sections: [imageSection, formatSection],
    });
  }

  const db = parseArtworkDB(buildRealisticDb());

  it('has expected number of MHII entries', () => {
    expect(db.images).toHaveLength(IMAGE_COUNT);
  });

  it('has 2 formats (1028 and 1029)', () => {
    expect(db.formats).toHaveLength(2);
    const formatIds = db.formats.map((f) => f.formatId).sort();
    expect(formatIds).toEqual([1028, 1029]);
  });

  it('format 1028 has imageSize 20000', () => {
    const fmt = db.formats.find((f) => f.formatId === 1028);
    expect(fmt).toBeDefined();
    expect(fmt!.imageSize).toBe(20000);
  });

  it('format 1029 has imageSize 80000', () => {
    const fmt = db.formats.find((f) => f.formatId === 1029);
    expect(fmt).toBeDefined();
    expect(fmt!.imageSize).toBe(80000);
  });

  it('all image IDs are sequential starting from 100', () => {
    const ids = db.images.map((img) => img.imageId);
    for (let i = 0; i < ids.length; i++) {
      expect(ids[i]).toBe(100 + i);
    }
  });

  it('every MHII has exactly 2 thumbnails', () => {
    for (const img of db.images) {
      expect(img.thumbnails).toHaveLength(2);
    }
  });
});
