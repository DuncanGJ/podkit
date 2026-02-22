/**
 * Shared types for podkit-core
 */

/**
 * Supported audio file types for collection sources
 */
export type AudioFileType =
  | 'flac'
  | 'mp3'
  | 'm4a'
  | 'aac'
  | 'ogg'
  | 'opus'
  | 'wav'
  | 'alac';

/**
 * Core track metadata shared across collection and iPod
 */
export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  duration?: number; // milliseconds
}

/**
 * Filter criteria for querying tracks
 */
export interface TrackFilter {
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  /** Glob pattern for file paths */
  pathPattern?: string;
}

/**
 * Error types for podkit operations
 */
export type PodkitError =
  | { type: 'device-not-found'; message: string }
  | { type: 'device-not-writable'; message: string; path: string }
  | { type: 'collection-error'; source: string; message: string }
  | { type: 'transcode-error'; file: string; message: string }
  | { type: 'copy-error'; file: string; message: string }
  | { type: 'database-error'; message: string }
  | { type: 'space-error'; required: number; available: number };

/**
 * Helper to create typed errors
 */
export function createError<T extends PodkitError['type']>(
  type: T,
  details: Omit<Extract<PodkitError, { type: T }>, 'type'>
): Extract<PodkitError, { type: T }> {
  return { type, ...details } as Extract<PodkitError, { type: T }>;
}
