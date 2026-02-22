/**
 * Artwork processing types
 *
 * Types for extracting, resizing, and preparing artwork
 * for iPod devices.
 */

/**
 * Artwork image format supported by iPod
 */
export interface ArtworkFormat {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Pixel format */
  format: 'rgb565' | 'jpeg';
}

/**
 * Predefined artwork formats for different iPod models
 */
export const IPOD_ARTWORK_FORMATS = {
  /** iPod Video artwork formats */
  video: [
    { width: 100, height: 100, format: 'rgb565' },
    { width: 200, height: 200, format: 'rgb565' },
  ] satisfies ArtworkFormat[],

  /** iPod Nano artwork formats */
  nano: [
    { width: 42, height: 42, format: 'rgb565' },
    { width: 100, height: 100, format: 'rgb565' },
  ] satisfies ArtworkFormat[],

  /** iPod Classic artwork formats */
  classic: [
    { width: 55, height: 55, format: 'rgb565' },
    { width: 140, height: 140, format: 'rgb565' },
    { width: 320, height: 320, format: 'rgb565' },
  ] satisfies ArtworkFormat[],
} as const;

/**
 * Source of artwork image
 */
export type ArtworkSource =
  | { type: 'embedded'; audioFile: string }
  | { type: 'external'; imagePath: string }
  | { type: 'buffer'; data: Buffer; mimeType: string };

/**
 * Result of artwork extraction
 */
export interface ExtractedArtwork {
  /** Image data */
  data: Buffer;
  /** MIME type (e.g., 'image/jpeg', 'image/png') */
  mimeType: string;
  /** Original dimensions */
  width: number;
  height: number;
}

/**
 * Artwork processor interface
 */
export interface ArtworkProcessor {
  /**
   * Extract embedded artwork from an audio file
   * Returns null if no artwork is found
   */
  extractEmbedded(file: string): Promise<ExtractedArtwork | null>;

  /**
   * Find external artwork file in directory
   * Looks for cover.jpg, folder.jpg, etc.
   * Returns the path to the found file, or null
   */
  findExternal(directory: string): Promise<string | null>;

  /**
   * Load and parse an external artwork file
   */
  loadExternal(imagePath: string): Promise<ExtractedArtwork>;

  /**
   * Resize artwork to iPod-compatible format
   */
  resize(image: Buffer, format: ArtworkFormat): Promise<Buffer>;
}

/**
 * Common external artwork filenames to search for
 */
export const EXTERNAL_ARTWORK_NAMES = [
  'cover.jpg',
  'cover.jpeg',
  'cover.png',
  'folder.jpg',
  'folder.jpeg',
  'folder.png',
  'album.jpg',
  'album.jpeg',
  'album.png',
  'front.jpg',
  'front.jpeg',
  'front.png',
] as const;

/**
 * Options for artwork processing
 */
export interface ArtworkOptions {
  /** Whether to search for external artwork if embedded not found */
  searchExternal?: boolean;
  /** Additional filenames to search for */
  additionalFilenames?: string[];
  /** Target formats to resize to */
  targetFormats?: ArtworkFormat[];
}
