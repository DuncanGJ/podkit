/**
 * artworkdb-parser.ts — Binary ArtworkDB parser for iPod
 *
 * Parses the iPod's ArtworkDB binary file format directly, without libgpod.
 * All multi-byte integers are little-endian.
 *
 * Record hierarchy:
 *   MHFD (database)
 *     → MHSD (section, index=1: image list)
 *         → MHLI
 *             → MHII (image item)
 *                 → MHOD (type=2, thumbnail container)
 *                     → MHNI (thumbnail reference)
 *                         → MHOD (type=3, filename string)
 *     → MHSD (section, index=3: file/format list)
 *         → MHLF
 *             → MHIF (format info)
 */

// ── Exported types ──────────────────────────────────────────────────────────

export interface MHNIEntry {
  formatId: number; // 1028 = 100×100, 1029 = 200×200
  itmbOffset: number; // byte offset into the .ithmb file
  imageSize: number; // bytes of pixel data for this thumbnail
  width: number;
  height: number;
  verticalPadding: number;
  horizontalPadding: number;
  filename: string; // e.g. ":F1028_1.ithmb"
}

export interface MHIIEntry {
  imageId: number; // artwork ID (matches track.mhii_link)
  songId: bigint; // track dbid
  rating: number;
  origImgSize: number;
  thumbnails: MHNIEntry[];
}

export interface MHIFEntry {
  formatId: number;
  imageSize: number; // bytes per thumbnail slot for this format
}

export interface ArtworkDB {
  nextId: number;
  images: MHIIEntry[];
  formats: MHIFEntry[];
}

// ── Helper: read a 4-byte ASCII magic string ────────────────────────────────

function readMagic(buf: Buffer, offset: number): string {
  return buf.toString('ascii', offset, offset + 4);
}

// ── Helper: assert magic matches expected ───────────────────────────────────

function expectMagic(buf: Buffer, offset: number, expected: string): void {
  const actual = readMagic(buf, offset);
  if (actual !== expected) {
    throw new Error(
      `Expected magic "${expected}" at offset 0x${offset.toString(16)}, got "${actual}" (0x${buf.readUInt32LE(offset).toString(16)})`
    );
  }
}

// ── Parse MHOD type 3 (filename string) ─────────────────────────────────────

function parseMHODFilename(buf: Buffer, offset: number): string {
  expectMagic(buf, offset, 'mhod');

  // ArtworkDB_MhodHeaderString layout (from libgpod db-itunes-parser.h):
  //   0: header_id[4]    4: header_len    8: total_len
  //  12: type(i16)      14: unknown13(i8) 15: padding_len(i8)
  //  16: unknown1(i32)  20: unknown2(i32) 24: string_len(i32)
  //  28: encoding(i8)   29: unknown5      30: unknown6(i16)
  //  32: unknown4(i32)  36: string[]
  const stringLen = buf.readUInt32LE(offset + 24);
  const encoding = buf.readUInt8(offset + 28);

  const stringDataOffset = offset + 36;

  if (encoding === 2) {
    // UTF-16LE
    return buf.toString('utf16le', stringDataOffset, stringDataOffset + stringLen);
  }
  // Default to UTF-8
  return buf.toString('utf8', stringDataOffset, stringDataOffset + stringLen);
}

// ── Parse MHNI (thumbnail reference) ────────────────────────────────────────

function parseMHNI(buf: Buffer, offset: number): MHNIEntry {
  expectMagic(buf, offset, 'mhni');
  const headerLen = buf.readUInt32LE(offset + 4);
  const formatId = buf.readUInt32LE(offset + 16);
  const itmbOffset = buf.readUInt32LE(offset + 20);
  const imageSize = buf.readUInt32LE(offset + 24);
  const verticalPadding = buf.readInt16LE(offset + 28);
  const horizontalPadding = buf.readInt16LE(offset + 30);
  const imageHeight = buf.readUInt16LE(offset + 32);
  const imageWidth = buf.readUInt16LE(offset + 34);

  // The MHNI's child is an MHOD type 3 (filename), starting at headerLen
  let filename = '';
  const childOffset = offset + headerLen;
  if (childOffset < buf.length) {
    const childMagic = readMagic(buf, childOffset);
    if (childMagic === 'mhod') {
      const childType = buf.readUInt16LE(childOffset + 12);
      if (childType === 3) {
        filename = parseMHODFilename(buf, childOffset);
      }
    }
  }

  return {
    formatId,
    itmbOffset,
    imageSize,
    width: imageWidth,
    height: imageHeight,
    verticalPadding,
    horizontalPadding,
    filename,
  };
}

// ── Parse MHII (image item) and its MHOD/MHNI children ────────────────────

function parseMHII(buf: Buffer, offset: number): MHIIEntry {
  expectMagic(buf, offset, 'mhii');
  const headerLen = buf.readUInt32LE(offset + 4);
  const totalLen = buf.readUInt32LE(offset + 8);
  const numChildren = buf.readUInt32LE(offset + 12);
  const imageId = buf.readUInt32LE(offset + 16);
  const songId = buf.readBigUInt64LE(offset + 20);
  const rating = buf.readUInt32LE(offset + 32);
  const origImgSize = buf.readUInt32LE(offset + 48);

  const thumbnails: MHNIEntry[] = [];

  // Walk children (MHOD entries) within the MHII's total_len
  let childOffset = offset + headerLen;
  const endOffset = offset + totalLen;

  for (let i = 0; i < numChildren && childOffset < endOffset; i++) {
    const childMagic = readMagic(buf, childOffset);
    if (childMagic !== 'mhod') {
      // Unexpected child type — skip by trying to read its total_len
      const childTotal = buf.readUInt32LE(childOffset + 8);
      childOffset += childTotal;
      continue;
    }

    const mhodHeaderLen = buf.readUInt32LE(childOffset + 4);
    const mhodTotalLen = buf.readUInt32LE(childOffset + 8);
    const mhodType = buf.readUInt16LE(childOffset + 12);

    if (mhodType === 2) {
      // Thumbnail container — its child MHNI starts at the MHOD's headerLen
      const mhniOffset = childOffset + mhodHeaderLen;
      if (mhniOffset < buf.length && readMagic(buf, mhniOffset) === 'mhni') {
        thumbnails.push(parseMHNI(buf, mhniOffset));
      }
    }
    // Skip other MHOD types (type 1, etc.)

    childOffset += mhodTotalLen;
  }

  return {
    imageId,
    songId,
    rating,
    origImgSize,
    thumbnails,
  };
}

// ── Parse MHIF (format info) ───────────────────────────────────────────────

function parseMHIF(buf: Buffer, offset: number): { entry: MHIFEntry; totalLen: number } {
  expectMagic(buf, offset, 'mhif');
  const headerLen = buf.readUInt32LE(offset + 4);
  const totalLen = buf.readUInt32LE(offset + 8);
  const formatId = buf.readUInt32LE(offset + 16);
  const imageSize = buf.readUInt32LE(offset + 20);

  return {
    entry: { formatId, imageSize },
    totalLen: totalLen || headerLen, // totalLen == headerLen for MHIF
  };
}

// ── Parse MHSD sections ────────────────────────────────────────────────────

function parseSections(
  buf: Buffer,
  offset: number,
  numSections: number
): { images: MHIIEntry[]; formats: MHIFEntry[] } {
  const images: MHIIEntry[] = [];
  const formats: MHIFEntry[] = [];
  let pos = offset;

  for (let s = 0; s < numSections && pos < buf.length; s++) {
    expectMagic(buf, pos, 'mhsd');
    const mhsdHeaderLen = buf.readUInt32LE(pos + 4);
    const mhsdTotalLen = buf.readUInt32LE(pos + 8);
    const sectionIndex = buf.readUInt16LE(pos + 12);

    const sectionDataStart = pos + mhsdHeaderLen;

    if (sectionIndex === 1) {
      // Image list section → MHLI → MHII entries
      expectMagic(buf, sectionDataStart, 'mhli');
      const mhliHeaderLen = buf.readUInt32LE(sectionDataStart + 4);
      const numImages = buf.readUInt32LE(sectionDataStart + 8);

      let imgPos = sectionDataStart + mhliHeaderLen;
      for (let i = 0; i < numImages && imgPos < pos + mhsdTotalLen; i++) {
        const mhii = parseMHII(buf, imgPos);
        images.push(mhii);
        // Advance by MHII's total_len
        const mhiiTotalLen = buf.readUInt32LE(imgPos + 8);
        imgPos += mhiiTotalLen;
      }
    } else if (sectionIndex === 3) {
      // File/format list section → MHLF → MHIF entries
      expectMagic(buf, sectionDataStart, 'mhlf');
      const mhlfHeaderLen = buf.readUInt32LE(sectionDataStart + 4);
      const numFiles = buf.readUInt32LE(sectionDataStart + 8);

      let fmtPos = sectionDataStart + mhlfHeaderLen;
      for (let i = 0; i < numFiles && fmtPos < pos + mhsdTotalLen; i++) {
        const { entry, totalLen } = parseMHIF(buf, fmtPos);
        formats.push(entry);
        fmtPos += totalLen;
      }
    }
    // Section index 2 (album list) — skip

    pos += mhsdTotalLen;
  }

  return { images, formats };
}

// ── Main parser entry point ─────────────────────────────────────────────────

export function parseArtworkDB(buffer: Buffer): ArtworkDB {
  // Parse MHFD (database header)
  expectMagic(buffer, 0, 'mhfd');
  const headerLen = buffer.readUInt32LE(4);
  const numChildren = buffer.readUInt32LE(20);
  const nextId = buffer.readUInt32LE(28);

  // Sections start right after the MHFD header
  const { images, formats } = parseSections(buffer, headerLen, numChildren);

  return { nextId, images, formats };
}
