import { describe, it, expect } from 'bun:test';
import { AlbumArtworkCache, getAlbumKey } from './album-cache.js';
import type { ExtractedArtwork } from './types.js';
import { hashArtwork } from './hash.js';

const fakeArtwork: ExtractedArtwork = {
  data: Buffer.from('fake-image-data'),
  mimeType: 'image/jpeg',
  width: 300,
  height: 300,
};

describe('getAlbumKey', () => {
  it('normalizes artist and album', () => {
    const key1 = getAlbumKey({ artist: 'The Beatles', album: 'Abbey Road' });
    const key2 = getAlbumKey({ artist: 'the beatles', album: 'abbey road' });
    expect(key1).toBe(key2);
  });

  it('produces different keys for different albums', () => {
    const key1 = getAlbumKey({ artist: 'Artist', album: 'Album A' });
    const key2 = getAlbumKey({ artist: 'Artist', album: 'Album B' });
    expect(key1).not.toBe(key2);
  });
});

describe('AlbumArtworkCache', () => {
  it('returns extracted artwork on cache miss', async () => {
    const cache = new AlbumArtworkCache({
      extractArtwork: async () => fakeArtwork,
    });

    const entry = await cache.get({ artist: 'Artist', album: 'Album' }, '/fake/path.flac');

    expect(entry).not.toBeNull();
    expect(entry!.data).toEqual(fakeArtwork.data);
    expect(entry!.hash).toBe(hashArtwork(fakeArtwork.data));
  });

  it('returns null when source has no artwork', async () => {
    const cache = new AlbumArtworkCache({
      extractArtwork: async () => null,
    });

    const entry = await cache.get({ artist: 'Artist', album: 'Album' }, '/fake/path.flac');
    expect(entry).toBeNull();
  });

  it('caches by album — second call does not re-extract', async () => {
    let extractCount = 0;
    const cache = new AlbumArtworkCache({
      extractArtwork: async () => {
        extractCount++;
        return fakeArtwork;
      },
    });

    const track = { artist: 'Artist', album: 'Album' };
    await cache.get(track, '/fake/track1.flac');
    await cache.get(track, '/fake/track2.flac');

    expect(extractCount).toBe(1);
    expect(cache.size).toBe(1);
  });

  it('caches null results (no artwork) to avoid re-extraction', async () => {
    let extractCount = 0;
    const cache = new AlbumArtworkCache({
      extractArtwork: async () => {
        extractCount++;
        return null;
      },
    });

    const track = { artist: 'Artist', album: 'Album' };
    await cache.get(track, '/fake/track1.flac');
    await cache.get(track, '/fake/track2.flac');

    expect(extractCount).toBe(1);
  });

  it('treats different albums as separate cache entries', async () => {
    let extractCount = 0;
    const cache = new AlbumArtworkCache({
      extractArtwork: async () => {
        extractCount++;
        return fakeArtwork;
      },
    });

    await cache.get({ artist: 'Artist', album: 'Album A' }, '/fake/a.flac');
    await cache.get({ artist: 'Artist', album: 'Album B' }, '/fake/b.flac');

    expect(extractCount).toBe(2);
    expect(cache.size).toBe(2);
  });

  it('clear() resets the cache', async () => {
    let extractCount = 0;
    const cache = new AlbumArtworkCache({
      extractArtwork: async () => {
        extractCount++;
        return fakeArtwork;
      },
    });

    const track = { artist: 'Artist', album: 'Album' };
    await cache.get(track, '/fake/path.flac');
    cache.clear();
    await cache.get(track, '/fake/path.flac');

    expect(extractCount).toBe(2);
    expect(cache.size).toBe(1);
  });
});
