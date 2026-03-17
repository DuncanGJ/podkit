/**
 * Artwork hash utility
 *
 * Computes a compact hash of artwork bytes for change detection.
 * Used to populate the `art=XXXXXXXX` field in sync tags, enabling
 * detection of artwork changes (not just presence/absence).
 *
 * @module
 */

import { createHash } from 'node:crypto';

/**
 * Hash artwork data to an 8-character hex string.
 *
 * Uses SHA-256 truncated to 32 bits for a compact,
 * collision-resistant fingerprint suitable for embedding in sync tags.
 *
 * @param data - Raw artwork image bytes
 * @returns 8-character lowercase hex string (32-bit hash)
 */
export function hashArtwork(data: Buffer | Uint8Array): string {
  const digest = createHash('sha256').update(data).digest();
  const truncated = digest.readUInt32BE(0);
  return truncated.toString(16).padStart(8, '0');
}
