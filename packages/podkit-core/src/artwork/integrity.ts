/**
 * integrity.ts — Artwork integrity checker for iPod
 *
 * Checks a parsed ArtworkDB for anomalies:
 *   - .ithmb offset out-of-bounds (pixel data beyond file boundary)
 *   - .ithmb offset misalignment (not on a slot boundary)
 *   - Duplicate offsets within the same format
 *   - Duplicate MHII image IDs
 */

import { statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtworkDB } from './artworkdb-parser.js';

// ── Exported types ──────────────────────────────────────────────────────────

export type AnomalyType = 'out-of-bounds' | 'misaligned' | 'duplicate-offset' | 'duplicate-id';

export interface Anomaly {
  type: AnomalyType;
  severity: 'error' | 'warning';
  description: string;
  details: Record<string, unknown>;
}

export interface FormatSummary {
  formatId: number;
  slotSize: number;
  fileSize: number;
  totalEntries: number;
  outOfBoundsEntries: number;
}

export interface IntegrityReport {
  summary: {
    totalMHII: number;
    totalMHNI: number;
    anomalyCount: number;
    outOfBoundsCount: number;
    formats: FormatSummary[];
  };
  anomalies: Anomaly[];
}

// ── Default slot sizes per format (fallback when MHIF data unavailable) ────

const DEFAULT_SLOT_SIZES: Record<number, number> = {
  1028: 20000, // 100×100 RGB565 = 100*100*2 = 20000
  1029: 80000, // 200×200 RGB565 = 200*200*2 = 80000
};

// ── Resolve .ithmb filename to a filesystem path ────────────────────────────

function resolveItmbPath(ipodPath: string, filename: string): string {
  // iPod filenames use colon separators like ":F1028_1.ithmb"
  const cleaned = filename.replace(/^:/, '').replace(/:/g, '/');
  return join(ipodPath, 'iPod_Control', 'Artwork', cleaned);
}

// ── Build a map of format ID → slot size from MHIF entries ──────────────────

function buildSlotSizeMap(db: ArtworkDB): Record<number, number> {
  const map: Record<number, number> = { ...DEFAULT_SLOT_SIZES };
  for (const fmt of db.formats) {
    map[fmt.formatId] = fmt.imageSize;
  }
  return map;
}

// ── Main integrity check ────────────────────────────────────────────────────

export function checkIntegrity(db: ArtworkDB, ipodPath: string): IntegrityReport {
  const anomalies: Anomaly[] = [];
  const slotSizes = buildSlotSizeMap(db);

  let totalMHNI = 0;
  let outOfBoundsCount = 0;

  // Per-format tracking
  const formatStats = new Map<
    number,
    { totalEntries: number; outOfBoundsEntries: number; fileSize: number }
  >();

  // For duplicate detection: key = `${formatId}:${filename}:${offset}`
  const seenOffsets = new Map<string, { imageId: number; songId: bigint }>();

  // For duplicate image ID detection
  const seenImageIds = new Map<number, number>();

  // Cache .ithmb file sizes
  const fileSizeCache = new Map<string, number>();
  function getCachedFileSize(path: string): number {
    if (!fileSizeCache.has(path)) {
      fileSizeCache.set(path, existsSync(path) ? statSync(path).size : -1);
    }
    return fileSizeCache.get(path)!;
  }

  for (const mhii of db.images) {
    // Check for duplicate image IDs
    const idCount = (seenImageIds.get(mhii.imageId) ?? 0) + 1;
    seenImageIds.set(mhii.imageId, idCount);
    if (idCount === 2) {
      anomalies.push({
        type: 'duplicate-id',
        severity: 'error',
        description: `Duplicate MHII image_id ${mhii.imageId}`,
        details: {
          imageId: mhii.imageId,
          songId: mhii.songId.toString(),
        },
      });
    }

    for (const mhni of mhii.thumbnails) {
      totalMHNI++;

      // Track per-format stats
      let stats = formatStats.get(mhni.formatId);
      if (!stats) {
        const itmbPath = resolveItmbPath(ipodPath, mhni.filename);
        stats = {
          totalEntries: 0,
          outOfBoundsEntries: 0,
          fileSize: getCachedFileSize(itmbPath),
        };
        formatStats.set(mhni.formatId, stats);
      }
      stats.totalEntries++;

      // Resolve the .ithmb file and check bounds
      const itmbPath = resolveItmbPath(ipodPath, mhni.filename);
      const fileSize = getCachedFileSize(itmbPath);

      if (fileSize === -1) {
        stats.outOfBoundsEntries++;
        outOfBoundsCount++;
        anomalies.push({
          type: 'out-of-bounds',
          severity: 'error',
          description: `Missing .ithmb file: ${mhni.filename}`,
          details: {
            imageId: mhii.imageId,
            songId: mhii.songId.toString(),
            filename: mhni.filename,
          },
        });
      } else {
        const endByte = mhni.itmbOffset + mhni.imageSize;
        if (endByte > fileSize) {
          stats.outOfBoundsEntries++;
          outOfBoundsCount++;
          anomalies.push({
            type: 'out-of-bounds',
            severity: 'error',
            description: `Thumbnail data exceeds .ithmb file bounds (offset ${mhni.itmbOffset} + size ${mhni.imageSize} = ${endByte} > file size ${fileSize})`,
            details: {
              imageId: mhii.imageId,
              songId: mhii.songId.toString(),
              formatId: mhni.formatId,
              filename: mhni.filename,
              offset: mhni.itmbOffset,
              imageSize: mhni.imageSize,
              fileSize,
            },
          });
        }
      }

      // Check offset alignment
      const slotSize = slotSizes[mhni.formatId];
      if (slotSize && mhni.itmbOffset % slotSize !== 0) {
        anomalies.push({
          type: 'misaligned',
          severity: 'warning',
          description: `Thumbnail offset ${mhni.itmbOffset} not aligned to slot size ${slotSize} for format ${mhni.formatId}`,
          details: {
            imageId: mhii.imageId,
            formatId: mhni.formatId,
            offset: mhni.itmbOffset,
            slotSize,
          },
        });
      }

      // Check for duplicate offsets within same format/file
      const offsetKey = `${mhni.formatId}:${mhni.filename}:${mhni.itmbOffset}`;
      const existing = seenOffsets.get(offsetKey);
      if (existing) {
        anomalies.push({
          type: 'duplicate-offset',
          severity: 'error',
          description: `Two MHII entries point to the same .ithmb slot: format ${mhni.formatId}, offset ${mhni.itmbOffset}`,
          details: {
            formatId: mhni.formatId,
            filename: mhni.filename,
            offset: mhni.itmbOffset,
            imageId1: existing.imageId,
            imageId2: mhii.imageId,
          },
        });
      } else {
        seenOffsets.set(offsetKey, {
          imageId: mhii.imageId,
          songId: mhii.songId,
        });
      }
    }
  }

  // Build format summaries
  const formats: FormatSummary[] = [];
  for (const [formatId, stats] of formatStats) {
    formats.push({
      formatId,
      slotSize: slotSizes[formatId] ?? 0,
      fileSize: stats.fileSize,
      totalEntries: stats.totalEntries,
      outOfBoundsEntries: stats.outOfBoundsEntries,
    });
  }
  formats.sort((a, b) => a.formatId - b.formatId);

  return {
    summary: {
      totalMHII: db.images.length,
      totalMHNI: totalMHNI,
      anomalyCount: anomalies.length,
      outOfBoundsCount,
      formats,
    },
    anomalies,
  };
}
