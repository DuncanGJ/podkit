/**
 * artworkdb-builder.ts — Programmatic builder for ArtworkDB binary structures
 *
 * Constructs valid iPod ArtworkDB byte sequences for testing the parser.
 * All multi-byte integers are written as little-endian, matching the iPod format.
 *
 * Record hierarchy:
 *   MHFD (database)
 *     -> MHSD (section, index=1: image list)
 *         -> MHLI
 *             -> MHII (image item)
 *                 -> MHOD (type=2, thumbnail container)
 *                     -> MHNI (thumbnail reference)
 *                         -> MHOD (type=3, filename string)
 *     -> MHSD (section, index=3: file/format list)
 *         -> MHLF
 *             -> MHIF (format info)
 */

// ── MHOD type 3: filename string ─────────────────────────────────────────────

export interface BuildMHODFilenameOpts {
  filename: string;
  encoding?: 1 | 2; // 1 = UTF-8 (default), 2 = UTF-16LE
}

export function buildMHODFilename(opts: string | BuildMHODFilenameOpts): Buffer {
  const { filename, encoding } =
    typeof opts === 'string'
      ? { filename: opts, encoding: 1 as const }
      : { encoding: 1 as const, ...opts };

  const stringBuf =
    encoding === 2 ? Buffer.from(filename, 'utf16le') : Buffer.from(filename, 'utf8');

  const headerLen = 36;
  const totalLen = headerLen + stringBuf.length;
  const buf = Buffer.alloc(totalLen);

  buf.write('mhod', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(totalLen, 8); // total_len
  buf.writeUInt16LE(3, 12); // type = 3 (filename)
  buf.writeUInt8(0, 14); // unknown13
  buf.writeUInt8(0, 15); // padding_len
  buf.writeUInt32LE(0, 16); // unknown1
  buf.writeUInt32LE(0, 20); // unknown2
  buf.writeUInt32LE(stringBuf.length, 24); // string_len
  buf.writeUInt8(encoding, 28); // encoding
  buf.writeUInt8(0, 29); // unknown5
  buf.writeUInt16LE(0, 30); // unknown6
  buf.writeUInt32LE(0, 32); // unknown4
  stringBuf.copy(buf, 36); // string data

  return buf;
}

// ── MHNI: thumbnail reference ────────────────────────────────────────────────

export interface BuildMHNIOpts {
  formatId: number;
  offset: number;
  imageSize: number;
  width: number;
  height: number;
  verticalPadding?: number;
  horizontalPadding?: number;
  filename: string;
  filenameEncoding?: 1 | 2;
}

export function buildMHNI(opts: BuildMHNIOpts): Buffer {
  const filenameMhod = buildMHODFilename({
    filename: opts.filename,
    encoding: opts.filenameEncoding,
  });

  const headerLen = 76; // standard MHNI header size
  const totalLen = headerLen + filenameMhod.length;
  const buf = Buffer.alloc(totalLen);

  buf.write('mhni', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(totalLen, 8); // total_len
  buf.writeUInt32LE(1, 12); // num_children (1 MHOD)
  buf.writeUInt32LE(opts.formatId, 16); // format_id
  buf.writeUInt32LE(opts.offset, 20); // ithmb_offset
  buf.writeUInt32LE(opts.imageSize, 24); // image_size
  buf.writeInt16LE(opts.verticalPadding ?? 0, 28); // vertical_padding
  buf.writeInt16LE(opts.horizontalPadding ?? 0, 30); // horizontal_padding
  buf.writeUInt16LE(opts.height, 32); // image_height
  buf.writeUInt16LE(opts.width, 34); // image_width

  filenameMhod.copy(buf, headerLen);

  return buf;
}

// ── MHOD type 2: thumbnail container (wraps an MHNI) ────────────────────────

export function buildMHODThumbnailContainer(mhniBuffer: Buffer): Buffer {
  const headerLen = 24; // standard MHOD header
  const totalLen = headerLen + mhniBuffer.length;
  const buf = Buffer.alloc(totalLen);

  buf.write('mhod', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(totalLen, 8); // total_len
  buf.writeUInt16LE(2, 12); // type = 2 (thumbnail container)
  // bytes 14-23: padding/unknown

  mhniBuffer.copy(buf, headerLen);

  return buf;
}

// ── MHII: image item ────────────────────────────────────────────────────────

export interface BuildMHIIOpts {
  imageId: number;
  songId: bigint;
  rating?: number;
  origImgSize?: number;
  thumbnails: Buffer[]; // pre-built MHOD type=2 containers
}

export function buildMHII(opts: BuildMHIIOpts): Buffer {
  const headerLen = 152; // standard MHII header size
  const childrenSize = opts.thumbnails.reduce((sum, b) => sum + b.length, 0);
  const totalLen = headerLen + childrenSize;
  const buf = Buffer.alloc(totalLen);

  buf.write('mhii', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(totalLen, 8); // total_len
  buf.writeUInt32LE(opts.thumbnails.length, 12); // num_children
  buf.writeUInt32LE(opts.imageId, 16); // image_id
  buf.writeBigUInt64LE(opts.songId, 20); // song_id (64-bit)
  buf.writeUInt32LE(opts.rating ?? 0, 32); // rating
  buf.writeUInt32LE(opts.origImgSize ?? 0, 48); // orig_img_size

  let offset = headerLen;
  for (const thumb of opts.thumbnails) {
    thumb.copy(buf, offset);
    offset += thumb.length;
  }

  return buf;
}

// ── MHIF: format info ───────────────────────────────────────────────────────

export interface BuildMHIFOpts {
  formatId: number;
  imageSize: number;
}

export function buildMHIF(opts: BuildMHIFOpts): Buffer {
  const headerLen = 24; // standard MHIF header
  const buf = Buffer.alloc(headerLen);

  buf.write('mhif', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(headerLen, 8); // total_len (same as header for MHIF)
  buf.writeUInt32LE(0, 12); // num_children
  buf.writeUInt32LE(opts.formatId, 16); // format_id
  buf.writeUInt32LE(opts.imageSize, 20); // image_size

  return buf;
}

// ── MHLI: image list container ──────────────────────────────────────────────

export function buildMHLI(mhiiBuffers: Buffer[]): Buffer {
  const headerLen = 12;
  const childrenSize = mhiiBuffers.reduce((sum, b) => sum + b.length, 0);
  const totalLen = headerLen + childrenSize;
  const buf = Buffer.alloc(totalLen);

  buf.write('mhli', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(mhiiBuffers.length, 8); // num_images

  let offset = headerLen;
  for (const mhii of mhiiBuffers) {
    mhii.copy(buf, offset);
    offset += mhii.length;
  }

  return buf;
}

// ── MHLF: format list container ─────────────────────────────────────────────

export function buildMHLF(mhifBuffers: Buffer[]): Buffer {
  const headerLen = 12;
  const childrenSize = mhifBuffers.reduce((sum, b) => sum + b.length, 0);
  const totalLen = headerLen + childrenSize;
  const buf = Buffer.alloc(totalLen);

  buf.write('mhlf', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(mhifBuffers.length, 8); // num_files

  let offset = headerLen;
  for (const mhif of mhifBuffers) {
    mhif.copy(buf, offset);
    offset += mhif.length;
  }

  return buf;
}

// ── MHSD: section container ────────────────────────────────────────────────

export interface BuildMHSDOpts {
  sectionIndex: number; // 1 = image list, 3 = format list
  contentBuffer: Buffer; // MHLI or MHLF
}

export function buildMHSD(opts: BuildMHSDOpts): Buffer {
  const headerLen = 16; // standard MHSD header
  const totalLen = headerLen + opts.contentBuffer.length;
  const buf = Buffer.alloc(totalLen);

  buf.write('mhsd', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(totalLen, 8); // total_len
  buf.writeUInt16LE(opts.sectionIndex, 12); // section_index

  opts.contentBuffer.copy(buf, headerLen);

  return buf;
}

// ── MHFD: database header (top-level) ───────────────────────────────────────

export interface BuildArtworkDBOpts {
  nextId: number;
  sections: Buffer[]; // pre-built MHSD sections
}

export function buildArtworkDB(opts: BuildArtworkDBOpts): Buffer {
  const headerLen = 84; // standard MHFD header size
  const sectionsSize = opts.sections.reduce((sum, b) => sum + b.length, 0);
  const totalLen = headerLen + sectionsSize;
  const buf = Buffer.alloc(totalLen);

  buf.write('mhfd', 0, 4, 'ascii'); // magic
  buf.writeUInt32LE(headerLen, 4); // header_len
  buf.writeUInt32LE(totalLen, 8); // total_len
  // bytes 12-15: unknown1
  // bytes 16-19: unknown2
  buf.writeUInt32LE(opts.sections.length, 20); // num_children (sections)
  // bytes 24-27: unknown3
  buf.writeUInt32LE(opts.nextId, 28); // next_id

  let offset = headerLen;
  for (const section of opts.sections) {
    section.copy(buf, offset);
    offset += section.length;
  }

  return buf;
}

// ── Convenience: build a complete thumbnail (MHOD type=2 wrapping MHNI) ────

export interface BuildThumbnailOpts {
  formatId: number;
  offset: number;
  imageSize: number;
  width: number;
  height: number;
  verticalPadding?: number;
  horizontalPadding?: number;
  filename: string;
  filenameEncoding?: 1 | 2;
}

export function buildThumbnail(opts: BuildThumbnailOpts): Buffer {
  const mhni = buildMHNI(opts);
  return buildMHODThumbnailContainer(mhni);
}
