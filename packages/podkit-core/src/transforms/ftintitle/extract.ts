/**
 * Featured artist extraction logic
 *
 * Ported from beets ftintitle plugin
 * Original: Copyright 2016, Verrus, <github.com/Verrus/beets-plugin-featInTitle>
 * Source: https://github.com/beetbox/beets/blob/master/beetsplug/ftintitle.py
 * License: MIT
 *
 * @module
 */

import {
  createFeatSplitPattern,
  findInsertPosition,
  titleContainsFeat,
} from './patterns.js';

/**
 * Result of extracting featured artist from artist string
 */
export interface ExtractResult {
  /** The main artist (without featuring info) */
  mainArtist: string;
  /** The featured artist(s), or null if none found */
  featuredArtist: string | null;
}

/**
 * Result of applying ftintitle transformation
 */
export interface FtInTitleResult {
  /** The new artist string (main artist only) */
  artist: string;
  /** The new title string (with featuring info added if applicable) */
  title: string;
  /** Whether any transformation was applied */
  changed: boolean;
}

/**
 * Extract featured artist from an artist string
 *
 * Splits the artist string on featuring tokens (feat., ft., featuring, etc.)
 * and returns the main artist and featured artist separately.
 *
 * Uses a two-stage approach:
 * 1. First tries explicit tokens only (feat, ft, featuring)
 * 2. Falls back to all tokens including generic separators (with, &, and)
 *
 * This prevents incorrectly splitting "Simon & Garfunkel" while still
 * handling "Artist & Guest" when more explicit tokens aren't present.
 *
 * @param artist - The artist string to split
 * @returns Main artist and featured artist (or null)
 *
 * @example
 * extractFeaturedArtist('Artist A feat. Artist B')
 * // { mainArtist: 'Artist A', featuredArtist: 'Artist B' }
 *
 * @example
 * extractFeaturedArtist('Artist A')
 * // { mainArtist: 'Artist A', featuredArtist: null }
 */
export function extractFeaturedArtist(artist: string): ExtractResult {
  // First try with explicit tokens only (most reliable)
  const explicitPattern = createFeatSplitPattern(false);
  let match = artist.match(explicitPattern);

  if (match && match[1] && match[2]) {
    return {
      mainArtist: match[1].trim(),
      featuredArtist: match[2].trim(),
    };
  }

  // Fall back to all tokens including generic separators
  const allPattern = createFeatSplitPattern(true);
  match = artist.match(allPattern);

  if (match && match[1] && match[2]) {
    return {
      mainArtist: match[1].trim(),
      featuredArtist: match[2].trim(),
    };
  }

  // No featuring info found
  return {
    mainArtist: artist,
    featuredArtist: null,
  };
}

/**
 * Insert featuring info into a title
 *
 * Places the featuring text at the appropriate position:
 * - Before any bracketed remix/edit/version info
 * - At the end if no such brackets exist
 *
 * @param title - The original title
 * @param featuredArtist - The featured artist(s) to add
 * @param format - Format string (e.g., "feat. {}")
 * @returns The title with featuring info inserted
 *
 * @example
 * insertFeatIntoTitle('Song', 'Artist B', 'feat. {}')
 * // 'Song (feat. Artist B)'
 *
 * @example
 * insertFeatIntoTitle('Song (Remix)', 'Artist B', 'feat. {}')
 * // 'Song (feat. Artist B) (Remix)'
 */
export function insertFeatIntoTitle(
  title: string,
  featuredArtist: string,
  format: string
): string {
  // Format the featuring text
  const featText = `(${format.replace('{}', featuredArtist)})`;

  // Find where to insert
  const insertPos = findInsertPosition(title);

  if (insertPos >= 0) {
    // Insert before the bracket keyword section
    const before = title.slice(0, insertPos).trimEnd();
    const after = title.slice(insertPos);
    return `${before} ${featText} ${after}`.trim();
  } else {
    // Append at the end
    return `${title} ${featText}`;
  }
}

/**
 * Apply the ftintitle transformation to a track's metadata
 *
 * This is the main transformation function that:
 * 1. Extracts featured artist from the artist field
 * 2. Checks if title already contains featuring info
 * 3. Inserts featuring info into title (unless drop mode)
 * 4. Returns cleaned artist and updated title
 *
 * @param artist - The track artist
 * @param title - The track title
 * @param options - Transform options
 * @returns The transformed artist and title
 *
 * @example
 * applyFtInTitle('Artist A feat. Artist B', 'Song Name', { drop: false, format: 'feat. {}' })
 * // { artist: 'Artist A', title: 'Song Name (feat. Artist B)', changed: true }
 */
export function applyFtInTitle(
  artist: string,
  title: string,
  options: { drop: boolean; format: string }
): FtInTitleResult {
  // Extract featured artist from artist string
  const { mainArtist, featuredArtist } = extractFeaturedArtist(artist);

  // If no featured artist found, nothing to do
  if (!featuredArtist) {
    return { artist, title, changed: false };
  }

  // If title already contains featuring info, don't double-add
  if (titleContainsFeat(title)) {
    // Still clean the artist field
    return { artist: mainArtist, title, changed: artist !== mainArtist };
  }

  // If drop mode, just clean the artist without updating title
  if (options.drop) {
    return { artist: mainArtist, title, changed: true };
  }

  // Insert featuring info into title
  const newTitle = insertFeatIntoTitle(title, featuredArtist, options.format);

  return {
    artist: mainArtist,
    title: newTitle,
    changed: true,
  };
}

/**
 * Check if an artist string contains featuring info
 *
 * @param artist - The artist string to check
 * @returns True if artist contains feat/ft/featuring/etc.
 */
export function artistContainsFeat(artist: string): boolean {
  const pattern = createFeatSplitPattern(false);
  return pattern.test(artist);
}

// Re-export from patterns for convenience
export { titleContainsFeat } from './patterns.js';
