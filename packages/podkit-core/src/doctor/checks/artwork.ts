/**
 * Artwork integrity check for podkit doctor
 *
 * Parses the iPod's ArtworkDB binary file and verifies that all thumbnail
 * references point to valid data within the .ithmb files. Detects the
 * corruption pattern where the ArtworkDB references offsets beyond the
 * ithmb file boundaries.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArtworkDB } from '../../artwork/artworkdb-parser.js';
import { checkIntegrity } from '../../artwork/integrity.js';
import type { DoctorCheck, DoctorCheckResult, DoctorContext } from '../index.js';

const DOCS_URL = 'https://jvgomg.github.io/podkit/troubleshooting/artwork-repair';

export const artworkIntegrityCheck: DoctorCheck = {
  id: 'artwork-integrity',
  name: 'Artwork Integrity',

  async run(ctx: DoctorContext): Promise<DoctorCheckResult> {
    const artworkDbPath = join(ctx.mountPoint, 'iPod_Control', 'Artwork', 'ArtworkDB');

    // Skip if no ArtworkDB exists (iPod has no artwork)
    if (!existsSync(artworkDbPath)) {
      return {
        status: 'skip',
        summary: 'No ArtworkDB found (iPod has no artwork)',
      };
    }

    let buffer: Buffer;
    try {
      buffer = readFileSync(artworkDbPath);
    } catch (error) {
      return {
        status: 'warn',
        summary: `Could not read ArtworkDB: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    if (buffer.length === 0) {
      return {
        status: 'skip',
        summary: 'ArtworkDB is empty',
      };
    }

    let db;
    try {
      db = parseArtworkDB(buffer);
    } catch (error) {
      return {
        status: 'warn',
        summary: `Could not parse ArtworkDB: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    if (db.images.length === 0) {
      return {
        status: 'pass',
        summary: 'ArtworkDB is empty (no artwork entries)',
      };
    }

    const report = checkIntegrity(db, ctx.mountPoint);
    const { outOfBoundsCount, totalMHNI, totalMHII, formats } = report.summary;

    if (outOfBoundsCount === 0) {
      const formatDesc = formats.map((f) => f.formatId).join(', ');
      return {
        status: 'pass',
        summary: `${totalMHII.toLocaleString()} entries, ${formats.length} format${formats.length === 1 ? '' : 's'} (${formatDesc}), all offsets valid`,
        details: {
          totalEntries: totalMHNI,
          formats: formats.map((f) => ({
            id: f.formatId,
            slotSize: f.slotSize,
            fileSize: f.fileSize,
            entries: f.totalEntries,
          })),
        },
      };
    }

    // Corruption detected — count against MHNI (thumbnail entries), not MHII (images)
    const pct = Math.round((outOfBoundsCount / totalMHNI) * 100);
    const healthyCount = totalMHNI - outOfBoundsCount;

    return {
      status: 'fail',
      summary: 'CORRUPTION DETECTED',
      details: {
        totalEntries: totalMHNI,
        corruptEntries: outOfBoundsCount,
        healthyEntries: healthyCount,
        corruptPercent: pct,
        formats: formats.map((f) => ({
          id: f.formatId,
          slotSize: f.slotSize,
          fileSize: f.fileSize,
          totalEntries: f.totalEntries,
          outOfBoundsEntries: f.outOfBoundsEntries,
        })),
      },
      repair: {
        flag: '--repair-artwork',
        description: 'Rebuild all artwork from source collection',
      },
      docsUrl: DOCS_URL,
    };
  },
};
