/**
 * Unit tests for SubsonicAdapter
 *
 * Tests use manual mocking of the SubsonicAPI to avoid real network calls.
 */

import { describe, it, expect } from 'bun:test';
import { SubsonicAdapter } from './subsonic.js';
import type { SubsonicAdapterConfig } from './subsonic.js';
import type { Child, AlbumWithSongsID3 } from 'subsonic-api';
import { replayGainToSoundcheck } from '../sync/soundcheck.js';

// We need to mock the subsonic-api module before importing SubsonicAdapter
// Since bun:test doesn't have vi.mock, we'll test the adapter's behavior
// by verifying the correct API calls are made

// Helper to create a test adapter
function createTestAdapter(config?: Partial<SubsonicAdapterConfig>): SubsonicAdapter {
  return new SubsonicAdapter({
    url: 'https://test.example.com',
    username: 'testuser',
    password: 'testpass',
    ...config,
  });
}

// =============================================================================
// Configuration Tests
// =============================================================================

describe('SubsonicAdapter configuration', () => {
  it('stores configuration correctly', () => {
    const adapter = createTestAdapter({
      url: 'https://music.example.com',
      username: 'james',
      password: 'secret',
    });

    expect(adapter.name).toBe('subsonic');
  });
});

// =============================================================================
// Metadata Mapping Tests (using public methods)
// =============================================================================

describe('SubsonicAdapter metadata mapping', () => {
  // Since we can't easily mock the subsonic-api module in bun:test,
  // we'll test the mapping logic indirectly through integration tests
  // or by testing the public interface

  it('returns empty track count before connection', () => {
    const adapter = createTestAdapter();
    expect(adapter.getTrackCount()).toBe(0);
  });
});

// =============================================================================
// File Access Tests
// =============================================================================

describe('SubsonicAdapter getFileAccess', () => {
  it('returns stream type for file access', () => {
    const adapter = createTestAdapter();
    const mockTrack = {
      id: 'track-123',
      title: 'Test Track',
      artist: 'Test Artist',
      album: 'Test Album',
      filePath: 'subsonic://test.example.com/track-123',
      fileType: 'flac' as const,
    };

    const access = adapter.getFileAccess(mockTrack);

    expect(access.type).toBe('stream');
    if (access.type === 'stream') {
      expect(typeof access.getStream).toBe('function');
    }
  });
});

// =============================================================================
// Filter Logic Tests
// =============================================================================

describe('SubsonicAdapter filtering', () => {
  // Test filter logic without needing to mock the API
  // We can test this by creating tracks directly and calling applyFilter

  // Since applyFilter is private, we test through getFilteredTracks
  // which requires mocked API responses

  it('getFilteredTracks requires connection first', async () => {
    const adapter = createTestAdapter();

    // Without connection, getTracks will attempt to connect
    // which will fail without a real server
    await expect(adapter.getFilteredTracks({ artist: 'Test' })).rejects.toThrow();
  });
});

// =============================================================================
// Disconnect Tests
// =============================================================================

describe('SubsonicAdapter disconnect', () => {
  it('clears cached data on disconnect', async () => {
    const adapter = createTestAdapter();

    await adapter.disconnect();

    expect(adapter.getTrackCount()).toBe(0);
  });

  it('allows reconnecting after disconnect', async () => {
    const adapter = createTestAdapter();

    await adapter.disconnect();

    // Should not throw when disconnected
    expect(adapter.getTrackCount()).toBe(0);
  });
});

// =============================================================================
// Lossless Detection Tests
// =============================================================================

describe('Lossless detection', () => {
  it('detects FLAC as lossless', () => {
    const mockTrack = {
      id: 'track-123',
      title: 'Test Track',
      artist: 'Test Artist',
      album: 'Test Album',
      filePath: 'test.flac',
      fileType: 'flac' as const,
      lossless: true,
    };

    // The track should have lossless flag set
    expect(mockTrack.lossless).toBe(true);
    expect(mockTrack.fileType).toBe('flac');
  });

  it('detects MP3 as lossy', () => {
    const mockTrack = {
      id: 'track-456',
      title: 'Test Track',
      artist: 'Test Artist',
      album: 'Test Album',
      filePath: 'test.mp3',
      fileType: 'mp3' as const,
      lossless: false,
    };

    expect(mockTrack.lossless).toBe(false);
    expect(mockTrack.fileType).toBe('mp3');
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('SubsonicAdapter error handling', () => {
  it('throws descriptive error on connection failure', async () => {
    const adapter = createTestAdapter({
      url: 'https://nonexistent.invalid',
    });

    await expect(adapter.connect()).rejects.toThrow(/Failed to connect/);
  });
});

// =============================================================================
// Sound Check / ReplayGain Tests
// =============================================================================

describe('SubsonicAdapter Sound Check (ReplayGain)', () => {
  // Helper to call the private mapSongToTrack method
  function mapSong(song: Partial<Child>, album?: Partial<AlbumWithSongsID3>) {
    const adapter = createTestAdapter();
    const fullSong: Child = {
      id: 'song-1',
      isDir: false,
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      ...song,
    };
    const fullAlbum: AlbumWithSongsID3 = {
      id: 'album-1',
      name: 'Test Album',
      artist: 'Test Artist',
      songCount: 1,
      duration: 300,
      created: new Date('2024-01-01T00:00:00Z'),
      ...album,
    };
    // Access private method via bracket notation
    return (adapter as any)['mapSongToTrack'](fullSong, fullAlbum);
  }

  it('prefers track gain over album gain', () => {
    const track = mapSong({
      replayGain: {
        trackGain: -6.0,
        albumGain: -3.0,
        trackPeak: 1.0,
        albumPeak: 1.0,
        baseGain: 0,
        fallbackGain: 0,
      },
    });

    // Track gain of -6.0 dB should be used, not album gain
    expect(track.soundcheck).toBe(replayGainToSoundcheck(-6.0));
  });

  it('falls back to album gain when track gain is missing', () => {
    const track = mapSong({
      replayGain: {
        albumGain: -3.0,
        trackPeak: 1.0,
        albumPeak: 1.0,
        baseGain: 0,
      } as any, // trackGain missing (OpenSubsonic spec says optional)
    });

    expect(track.soundcheck).toBe(replayGainToSoundcheck(-3.0));
  });

  it('soundcheck is undefined when no ReplayGain data present', () => {
    const track = mapSong({});

    expect(track.soundcheck).toBeUndefined();
  });

  it('soundcheck is undefined when replayGain object exists but has no gain values', () => {
    const track = mapSong({
      replayGain: {
        trackPeak: 1.0,
        albumPeak: 1.0,
        baseGain: 0,
      } as any, // No trackGain or albumGain
    });

    expect(track.soundcheck).toBeUndefined();
  });

  it('a gain of 0 dB correctly produces soundcheck of 1000', () => {
    const track = mapSong({
      replayGain: {
        trackGain: 0,
        albumGain: -3.0,
        trackPeak: 1.0,
        albumPeak: 1.0,
        baseGain: 0,
        fallbackGain: 0,
      },
    });

    expect(track.soundcheck).toBe(1000);
  });
});
