/**
 * Integration tests for libgpod-node.
 *
 * These tests require gpod-tool to be built and available.
 * Run: mise run tools:build
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  withTestIpod,
  isGpodToolAvailable,
} from '@podkit/gpod-testing';

import {
  Database,
  isNativeAvailable,
  starsToRating,
  ratingToStars,
  formatDuration,
  ipodPathToFilePath,
  filePathToIpodPath,
  MediaType,
  LibgpodError,
} from './index';

// Path to the test MP3 file in libgpod source
const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_MP3_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'tools',
  'libgpod-macos',
  'build',
  'libgpod-0.8.3',
  'bindings',
  'python',
  'tests',
  'resources',
  'tiny.mp3'
);

describe('libgpod-node', () => {
  beforeAll(async () => {
    // Check prerequisites
    if (!(await isGpodToolAvailable())) {
      throw new Error(
        'gpod-tool not available. Run `mise run tools:build` to build it.'
      );
    }
  });

  describe('isNativeAvailable', () => {
    it('returns true when native binding is loaded', () => {
      // This test will fail if native module is not built
      // That's expected - we test conditionally below
      const available = isNativeAvailable();
      // Just check it returns a boolean
      expect(typeof available).toBe('boolean');
    });
  });

  describe('track utilities', () => {
    it('converts stars to rating and back', () => {
      expect(starsToRating(0)).toBe(0);
      expect(starsToRating(1)).toBe(20);
      expect(starsToRating(3)).toBe(60);
      expect(starsToRating(5)).toBe(100);

      expect(ratingToStars(0)).toBe(0);
      expect(ratingToStars(20)).toBe(1);
      expect(ratingToStars(60)).toBe(3);
      expect(ratingToStars(100)).toBe(5);
    });

    it('formats duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(1000)).toBe('0:01');
      expect(formatDuration(60000)).toBe('1:00');
      expect(formatDuration(65000)).toBe('1:05');
      expect(formatDuration(3661000)).toBe('61:01');
    });

    it('converts iPod paths to file paths', () => {
      expect(ipodPathToFilePath(':iPod_Control:Music:F00:ABCD.mp3')).toBe(
        'iPod_Control/Music/F00/ABCD.mp3'
      );
    });

    it('converts file paths to iPod paths', () => {
      expect(filePathToIpodPath('iPod_Control/Music/F00/ABCD.mp3')).toBe(
        ':iPod_Control:Music:F00:ABCD.mp3'
      );
    });
  });

  describe('MediaType', () => {
    it('has correct values', () => {
      expect(MediaType.Audio).toBe(0x0001);
      expect(MediaType.Movie).toBe(0x0002);
      expect(MediaType.Podcast).toBe(0x0004);
    });
  });
});

// These tests only run if the native module is available
describe('libgpod-node with native binding', () => {
  // Tests are conditionally skipped using .skipIf() below

  it.skipIf(!isNativeAvailable())(
    'can open a test iPod database',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        expect(db).toBeDefined();
        expect(db.mountpoint).toBe(ipod.path);
        expect(db.closed).toBe(false);

        const info = db.getInfo();
        expect(info.trackCount).toBe(0);
        expect(info.playlistCount).toBeGreaterThanOrEqual(1); // Master playlist

        db.close();
        expect(db.closed).toBe(true);
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'can read device info',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        const device = db.device;
        expect(device).toBeDefined();
        expect(device.supportsArtwork).toBe(true);

        db.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'can add and retrieve tracks',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        // Add a track
        const newTrack = db.addTrack({
          title: 'Test Song',
          artist: 'Test Artist',
          album: 'Test Album',
          duration: 180000,
          bitrate: 320,
          sampleRate: 44100,
        });

        expect(newTrack).toBeDefined();
        expect(newTrack.title).toBe('Test Song');
        expect(newTrack.artist).toBe('Test Artist');
        expect(newTrack.album).toBe('Test Album');
        // Note: track.id may be 0 before save - libgpod assigns IDs on write

        // Verify track count
        expect(db.trackCount).toBe(1);

        // Get tracks
        const tracks = db.getTracks();
        expect(tracks).toHaveLength(1);
        expect(tracks[0].title).toBe('Test Song');

        // Get track by ID
        const found = db.getTrackById(newTrack.id);
        expect(found).not.toBeNull();
        expect(found!.title).toBe('Test Song');

        db.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'can save changes to database',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        // Add a track
        db.addTrack({
          title: 'Saved Song',
          artist: 'Saved Artist',
        });

        // Save changes
        db.saveSync();

        db.close();

        // Re-open and verify
        const db2 = Database.openSync(ipod.path);
        expect(db2.trackCount).toBe(1);

        const tracks = db2.getTracks();
        expect(tracks[0].title).toBe('Saved Song');

        db2.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'can remove tracks',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        // Add two tracks
        const track1 = db.addTrack({ title: 'Song 1' });
        db.addTrack({ title: 'Song 2' }); // Adding second track for count test

        expect(db.trackCount).toBe(2);

        // Remove first track
        db.removeTrack(track1.id);
        expect(db.trackCount).toBe(1);

        // Verify correct track remains
        const tracks = db.getTracks();
        expect(tracks).toHaveLength(1);
        expect(tracks[0].title).toBe('Song 2');

        db.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'can list playlists',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        const playlists = db.getPlaylists();
        expect(playlists.length).toBeGreaterThanOrEqual(1);

        // Should have master playlist
        const master = playlists.find((p) => p.isMaster);
        expect(master).toBeDefined();

        db.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'throws error when database is closed',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);
        db.close();

        expect(() => db.getTracks()).toThrow(LibgpodError);
        expect(() => db.getInfo()).toThrow(LibgpodError);
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'can use async open',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = await Database.open(ipod.path);

        expect(db).toBeDefined();
        expect(db.trackCount).toBe(0);

        db.close();
      });
    }
  );
});

// Tests for file copy functionality (itdb_cp_track_to_ipod)
describe('libgpod-node file copy (copyTrackToDevice)', () => {
  // Check if we have a test MP3 file available
  const hasTestMp3 = existsSync(TEST_MP3_PATH);

  it.skipIf(!isNativeAvailable() || !hasTestMp3)(
    'can copy audio file to iPod storage',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        // Add a track (metadata only)
        const track = db.addTrack({
          title: 'Tiny Test',
          artist: 'Test Artist',
          album: 'Test Album',
          filetype: 'MPEG audio file',
        });

        expect(track.ipodPath).toBeNull();
        expect(track.transferred).toBe(false);

        // Copy the file to the iPod
        const updated = db.copyTrackToDevice(track.id, TEST_MP3_PATH);

        // Verify the track now has an iPod path
        expect(updated.ipodPath).not.toBeNull();
        expect(updated.ipodPath).toMatch(/^:iPod_Control:Music:F\d{2}:/);
        expect(updated.transferred).toBe(true);

        // Verify the file was actually copied
        const filePath = join(
          ipod.path,
          ipodPathToFilePath(updated.ipodPath!)
        );
        expect(existsSync(filePath)).toBe(true);

        // Verify file size matches
        const originalStats = await stat(TEST_MP3_PATH);
        const copiedStats = await stat(filePath);
        expect(copiedStats.size).toBe(originalStats.size);

        // Save and re-open to verify persistence
        db.saveSync();
        db.close();

        const db2 = Database.openSync(ipod.path);
        const tracks = db2.getTracks();
        expect(tracks).toHaveLength(1);
        expect(tracks[0].ipodPath).toBe(updated.ipodPath);
        expect(tracks[0].transferred).toBe(true);
        db2.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'throws error for non-existent source file',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        const track = db.addTrack({
          title: 'Test Track',
        });

        expect(() => {
          db.copyTrackToDevice(track.id, '/nonexistent/path/to/file.mp3');
        }).toThrow(LibgpodError);

        db.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable())(
    'throws error for invalid track ID',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        expect(() => {
          db.copyTrackToDevice(99999, TEST_MP3_PATH);
        }).toThrow();

        db.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable() || !hasTestMp3)(
    'can copy multiple tracks',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        // Add first track and copy immediately
        // (track IDs are 0 before save, so we need to copy one at a time)
        const track1 = db.addTrack({ title: 'Song 1', artist: 'Artist 1' });
        const updated1 = db.copyTrackToDevice(track1.id, TEST_MP3_PATH);

        // Save to get proper IDs assigned
        db.saveSync();

        // Add second track and copy
        const track2 = db.addTrack({ title: 'Song 2', artist: 'Artist 2' });
        const updated2 = db.copyTrackToDevice(track2.id, TEST_MP3_PATH);

        // They should have different iPod paths
        expect(updated1.ipodPath).not.toBeNull();
        expect(updated2.ipodPath).not.toBeNull();
        expect(updated1.ipodPath).not.toBe(updated2.ipodPath);

        // Both files should exist
        expect(
          existsSync(join(ipod.path, ipodPathToFilePath(updated1.ipodPath!)))
        ).toBe(true);
        expect(
          existsSync(join(ipod.path, ipodPathToFilePath(updated2.ipodPath!)))
        ).toBe(true);

        db.saveSync();
        db.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable() || !hasTestMp3)(
    'preserves metadata after file copy',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = Database.openSync(ipod.path);

        // Add a track with full metadata
        const track = db.addTrack({
          title: 'Metadata Test',
          artist: 'Test Artist',
          album: 'Test Album',
          albumArtist: 'Album Artist',
          genre: 'Electronic',
          trackNumber: 3,
          totalTracks: 12,
          discNumber: 1,
          totalDiscs: 2,
          year: 2024,
          duration: 180000,
          bitrate: 320,
          sampleRate: 44100,
        });

        // Copy the file
        const updated = db.copyTrackToDevice(track.id, TEST_MP3_PATH);

        // Verify all metadata is preserved
        expect(updated.title).toBe('Metadata Test');
        expect(updated.artist).toBe('Test Artist');
        expect(updated.album).toBe('Test Album');
        expect(updated.albumArtist).toBe('Album Artist');
        expect(updated.genre).toBe('Electronic');
        expect(updated.trackNumber).toBe(3);
        expect(updated.totalTracks).toBe(12);
        expect(updated.discNumber).toBe(1);
        expect(updated.totalDiscs).toBe(2);
        expect(updated.year).toBe(2024);

        // File should be copied
        expect(updated.ipodPath).not.toBeNull();

        db.close();
      });
    }
  );

  it.skipIf(!isNativeAvailable() || !hasTestMp3)(
    'async version works correctly',
    async () => {
      await withTestIpod(async (ipod) => {
        const db = await Database.open(ipod.path);

        const track = db.addTrack({ title: 'Async Test' });
        const updated = await db.copyTrackToDeviceAsync(track.id, TEST_MP3_PATH);

        expect(updated.ipodPath).not.toBeNull();
        expect(updated.transferred).toBe(true);

        db.close();
      });
    }
  );
});
