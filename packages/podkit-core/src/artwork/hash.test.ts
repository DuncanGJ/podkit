/**
 * Tests for artwork hash utility
 *
 * hashArtwork() produces compact, deterministic hashes of artwork bytes
 * for embedding in sync tags (art=XXXXXXXX field).
 */

import { describe, expect, it } from 'bun:test';
import { hashArtwork } from './hash.js';

describe('hashArtwork', () => {
  it('returns an 8-character lowercase hex string', () => {
    const data = Buffer.from('some artwork bytes');
    const result = hashArtwork(data);

    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is deterministic (same input produces same output)', () => {
    const data = Buffer.from('deterministic test data');
    const result1 = hashArtwork(data);
    const result2 = hashArtwork(data);

    expect(result1).toBe(result2);
  });

  it('produces different hashes for different inputs', () => {
    const data1 = Buffer.from('artwork version 1');
    const data2 = Buffer.from('artwork version 2');

    const hash1 = hashArtwork(data1);
    const hash2 = hashArtwork(data2);

    expect(hash1).not.toBe(hash2);
  });

  it('works with Buffer', () => {
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header
    const result = hashArtwork(data);

    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it('works with Uint8Array', () => {
    const data = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG header
    const result = hashArtwork(data);

    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it('produces a valid hash for empty buffer', () => {
    const data = Buffer.alloc(0);
    const result = hashArtwork(data);

    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it('produces consistent results between Buffer and Uint8Array for the same bytes', () => {
    const bytes = [0x01, 0x02, 0x03, 0x04, 0x05];
    const bufferHash = hashArtwork(Buffer.from(bytes));
    const uint8Hash = hashArtwork(new Uint8Array(bytes));

    expect(bufferHash).toBe(uint8Hash);
  });

  it('pads short hashes with leading zeros', () => {
    // The hash output is padStart(8, '0'), so even if the 32-bit value
    // is small, we still get 8 characters.
    // We can't control what input produces a small hash, but we can verify
    // the format contract holds for many inputs.
    for (let i = 0; i < 20; i++) {
      const data = Buffer.from(`test input ${i}`);
      const result = hashArtwork(data);
      expect(result).toHaveLength(8);
      expect(result).toMatch(/^[0-9a-f]{8}$/);
    }
  });
});
