/**
 * Artwork repair orchestrator
 *
 * Rebuilds all artwork on an iPod from source collection files.
 * The strategy:
 *   1. Remove all existing artwork and save (clears corrupt ithmb files)
 *   2. Set new artwork in batches, saving after each batch to bound memory
 *
 * Batched saves are necessary because libgpod holds full image data in memory
 * for MEMORY-type thumbnails until save() converts them to on-disk IPOD-type.
 * Without batching, a 2,500-track library can consume 1+ GB of RAM.
 *
 * Album-level artwork caching avoids redundant downloads/extractions — tracks
 * sharing the same (artist, album) reuse cached artwork data. For remote sources
 * like Subsonic, this reduces network traffic by ~10x (avg 10 tracks per album).
 *
 * @see ADR-013 for the full corruption investigation
 */

import type { IpodDatabase } from '../ipod/database.js';
import type { CollectionTrack, CollectionAdapter } from '../adapters/interface.js';
import { getMatchKey, normalizeArtist, normalizeAlbum } from '../sync/matching.js';
import {
  extractArtwork as defaultExtractArtwork,
  cleanupAllTempArtwork as defaultCleanupAllTempArtwork,
} from './extractor.js';
import type { ExtractedArtwork } from './types.js';
import { hashArtwork } from './hash.js';
import { parseSyncTag, writeSyncTag } from '../sync/sync-tags.js';
import { streamToTempFile, cleanupTempFile } from '../utils/stream.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** Number of tracks to process before saving to flush memory */
const BATCH_SIZE = 200;

/** Timeout for downloading a source file (ms) */
const DOWNLOAD_TIMEOUT_MS = 60_000;

// ── Types ───────────────────────────────────────────────────────────────────

export interface RepairProgress {
  current: number;
  total: number;
  matched: number;
  noSource: number;
  noArtwork: number;
  errors: number;
  /** Current track being processed (for display) */
  currentTrack?: { artist: string; title: string };
}

export interface RepairResult {
  totalTracks: number;
  matched: number;
  noSource: number;
  noArtwork: number;
  errors: number;
  errorDetails: Array<{ artist: string; title: string; error: string }>;
}

export interface RepairOptions {
  /** If true, don't modify the iPod — just report what would change */
  dryRun?: boolean;
  /** Called after each track is processed */
  onProgress?: (progress: RepairProgress) => void;
}

export interface RepairDependencies {
  /** Open iPod database */
  db: IpodDatabase;
  /** Source collection adapters (already connected) */
  adapters: CollectionAdapter[];
  /** Override artwork extraction (for testing) */
  extractArtwork?: (filePath: string) => Promise<ExtractedArtwork | null>;
  /** Override temp artwork cleanup (for testing) */
  cleanupAllTempArtwork?: () => Promise<void>;
}

// ── Implementation ──────────────────────────────────────────────────────────

/** Cache entry for album-level artwork. `null` means artwork was looked up but not found. */
type ArtworkCacheEntry = { data: Buffer; hash: string } | null;

/**
 * Clear the art= hash from a track's sync tag.
 * Called when artwork is removed but not replaced, so the next sync
 * knows it needs to re-add artwork rather than skipping it.
 */
function clearArtworkSyncTag(
  db: IpodDatabase,
  track: Parameters<IpodDatabase['updateTrack']>[0]
): void {
  const existingTag = parseSyncTag(track.comment);
  if (existingTag?.artworkHash) {
    existingTag.artworkHash = undefined;
    const updatedComment = writeSyncTag(track.comment, existingTag);
    db.updateTrack(track, { comment: updatedComment });
  }
}

/**
 * Build a match index from all source collections.
 * Returns a map from match key to { adapter, track } for artwork extraction.
 */
async function buildSourceIndex(
  adapters: CollectionAdapter[]
): Promise<Map<string, { adapter: CollectionAdapter; track: CollectionTrack }>> {
  const index = new Map<string, { adapter: CollectionAdapter; track: CollectionTrack }>();

  for (const adapter of adapters) {
    const tracks = await adapter.getTracks();
    for (const track of tracks) {
      const key = getMatchKey(track);
      if (!index.has(key)) {
        index.set(key, { adapter, track });
      }
    }
  }

  return index;
}

/**
 * Get a normalized album key for artwork caching.
 * Tracks with the same (artist, album) share artwork.
 */
function getAlbumKey(track: { artist: string; album: string }): string {
  return `${normalizeArtist(track.artist)}\x1F${normalizeAlbum(track.album)}`;
}

/**
 * Get the local file path for artwork extraction from a source track.
 * For local sources, returns the file path directly.
 * For remote sources (Subsonic), downloads to a temp file first.
 *
 * @returns { path, cleanup } where cleanup() removes any temp file
 */
async function getArtworkSourcePath(
  adapter: CollectionAdapter,
  track: CollectionTrack
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const fileAccess = await adapter.getFileAccess(track);

  if (fileAccess.type === 'path') {
    return { path: fileAccess.path, cleanup: async () => {} };
  }

  // Stream source — download to temp file with timeout
  const downloadPromise = streamToTempFile(fileAccess.getStream, fileAccess.size);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Download timed out')), DOWNLOAD_TIMEOUT_MS)
  );

  const tempPath = await Promise.race([downloadPromise, timeoutPromise]);
  return {
    path: tempPath,
    cleanup: () => cleanupTempFile(tempPath),
  };
}

/**
 * Repair all artwork on an iPod by rebuilding from source collections.
 *
 * Strategy:
 * 1. Remove all existing artwork from all tracks
 * 2. Save to clear corrupt ithmb files
 * 3. Process tracks in batches: extract artwork from source, set on track
 * 4. Save after each batch to flush MEMORY-type thumbnails to disk
 *
 * Artwork is cached per album — tracks sharing the same (artist, album)
 * reuse cached artwork data, avoiding redundant downloads and extractions.
 */
export async function repairArtwork(
  deps: RepairDependencies,
  options: RepairOptions = {}
): Promise<RepairResult> {
  const { db, adapters } = deps;
  const extractArtwork = deps.extractArtwork ?? defaultExtractArtwork;
  const cleanupAllTempArtwork = deps.cleanupAllTempArtwork ?? defaultCleanupAllTempArtwork;
  const { dryRun = false, onProgress } = options;

  // Build source track index from all adapters
  const sourceIndex = await buildSourceIndex(adapters);

  // Get all iPod tracks
  const ipodTracks = db.getTracks();
  const total = ipodTracks.length;

  const progress: RepairProgress = {
    current: 0,
    total,
    matched: 0,
    noSource: 0,
    noArtwork: 0,
    errors: 0,
  };

  const errorDetails: RepairResult['errorDetails'] = [];

  // Album-level artwork cache: album key → artwork data + hash, or null if no artwork
  const artworkCache = new Map<string, ArtworkCacheEntry>();

  try {
    // Phase 1: Remove all existing artwork and save to clear corrupt ithmb files
    if (!dryRun) {
      for (const ipodTrack of ipodTracks) {
        try {
          db.removeTrackArtwork(ipodTrack);
        } catch {
          // May fail if track has no artwork — that's fine
        }
      }
      await db.save();
    }

    // Phase 2: Set new artwork in batches
    let batchCount = 0;

    for (const ipodTrack of ipodTracks) {
      progress.current++;
      progress.currentTrack = { artist: ipodTrack.artist, title: ipodTrack.title };

      // Find matching source track
      const key = getMatchKey(ipodTrack);
      const source = sourceIndex.get(key);

      if (!source) {
        // No source match — artwork was cleared in phase 1, clear sync tag art= hash
        if (!dryRun) {
          clearArtworkSyncTag(db, ipodTrack);
        }
        progress.noSource++;
        onProgress?.(progress);
        continue;
      }

      // Extract artwork from source and set on track
      if (!dryRun) {
        try {
          // Check album-level artwork cache first
          const albumKey = getAlbumKey(ipodTrack);
          let cached = artworkCache.get(albumKey);

          if (cached === undefined) {
            // Cache miss — fetch and extract artwork for this album
            const { path: sourcePath, cleanup } = await getArtworkSourcePath(
              source.adapter,
              source.track
            );

            try {
              const artwork = await extractArtwork(sourcePath);

              if (artwork) {
                cached = { data: artwork.data, hash: hashArtwork(artwork.data) };
              } else {
                cached = null;
              }
            } finally {
              await cleanup();
            }

            artworkCache.set(albumKey, cached);
          }

          if (!cached) {
            // Source has no artwork — artwork was cleared in phase 1, clear sync tag art= hash
            clearArtworkSyncTag(db, ipodTrack);
            progress.noArtwork++;
            onProgress?.(progress);
            continue;
          }

          // Set artwork on the iPod track
          db.setTrackArtworkFromData(ipodTrack, cached.data);

          // Update sync tag art= hash (preserve all other fields)
          const existingTag = parseSyncTag(ipodTrack.comment);
          if (existingTag) {
            existingTag.artworkHash = cached.hash;
            const updatedComment = writeSyncTag(ipodTrack.comment, existingTag);
            db.updateTrack(ipodTrack, { comment: updatedComment });
          }

          progress.matched++;
          batchCount++;

          // Save after each batch to flush MEMORY-type thumbnails and free memory
          if (batchCount >= BATCH_SIZE) {
            await db.save();
            batchCount = 0;
          }
        } catch (error) {
          // Artwork was cleared in phase 1 but replacement failed — clear sync tag
          clearArtworkSyncTag(db, ipodTrack);
          progress.errors++;
          errorDetails.push({
            artist: ipodTrack.artist,
            title: ipodTrack.title,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        // Dry run: just count what would be matched
        progress.matched++;
      }

      onProgress?.(progress);
    }

    // Final save for any remaining tracks in the last partial batch
    if (!dryRun && batchCount > 0) {
      await db.save();
    }
  } finally {
    await cleanupAllTempArtwork();
  }

  return {
    totalTracks: total,
    matched: progress.matched,
    noSource: progress.noSource,
    noArtwork: progress.noArtwork,
    errors: progress.errors,
    errorDetails,
  };
}
