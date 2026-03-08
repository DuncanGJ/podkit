import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { createTestIpod, TestModels } from '@podkit/gpod-testing';
import { IpodDatabase, MediaType } from '@podkit/core';

/**
 * Integration tests for the clear command.
 *
 * These tests require gpod-tool to be built and available.
 * Run: `mise run tools:build` before running these tests.
 */
describe('clear command integration', () => {
  let testIpod: Awaited<ReturnType<typeof createTestIpod>> | null = null;

  afterEach(async () => {
    if (testIpod) {
      await testIpod.cleanup();
      testIpod = null;
    }
  });

  describe('removeTracksByContentType via IpodDatabase', () => {
    beforeEach(async () => {
      testIpod = await createTestIpod({
        model: TestModels.VIDEO_60GB,
        name: 'Test iPod',
      });
    });

    it('removes only music tracks when clearing music', async () => {
      // Add music tracks using IpodDatabase
      let ipod = await IpodDatabase.open(testIpod!.path);
      try {
        ipod.addTrack({ title: 'Song 1', artist: 'Artist 1', mediaType: MediaType.Audio });
        ipod.addTrack({ title: 'Song 2', artist: 'Artist 2', mediaType: MediaType.Audio });
        ipod.addTrack({ title: 'Movie 1', artist: 'Director 1', mediaType: MediaType.Movie });
        ipod.addTrack({ title: 'TV Episode 1', artist: 'Show 1', mediaType: MediaType.TVShow });
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Verify tracks were added
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        expect(ipod.trackCount).toBe(4);
      } finally {
        ipod.close();
      }

      // Clear music tracks
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        const result = ipod.removeTracksByContentType('music', { deleteFiles: false });
        expect(result.removedCount).toBe(2);
        expect(result.totalCount).toBe(2);
        expect(result.fileDeleteErrors).toEqual([]);
        expect(ipod.trackCount).toBe(2); // Only videos remain
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Verify only video tracks remain
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        expect(ipod.trackCount).toBe(2);
        const tracks = ipod.getTracks();
        expect(tracks.every(t =>
          (t.mediaType & MediaType.Movie) !== 0 ||
          (t.mediaType & MediaType.TVShow) !== 0
        )).toBe(true);
      } finally {
        ipod.close();
      }
    });

    it('removes only video tracks when clearing video', async () => {
      // Add mixed content using IpodDatabase
      let ipod = await IpodDatabase.open(testIpod!.path);
      try {
        ipod.addTrack({ title: 'Song 1', artist: 'Artist 1', mediaType: MediaType.Audio });
        ipod.addTrack({ title: 'Song 2', artist: 'Artist 2', mediaType: MediaType.Audio });
        ipod.addTrack({ title: 'Movie 1', artist: 'Director 1', mediaType: MediaType.Movie });
        ipod.addTrack({ title: 'TV Episode 1', artist: 'Show 1', mediaType: MediaType.TVShow });
        ipod.addTrack({ title: 'Music Video 1', artist: 'Artist 3', mediaType: MediaType.MusicVideo });
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Clear video tracks
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        const result = ipod.removeTracksByContentType('video', { deleteFiles: false });
        expect(result.removedCount).toBe(3); // Movie, TV Show, Music Video
        expect(result.totalCount).toBe(3);
        expect(ipod.trackCount).toBe(2); // Only music remains
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Verify only music tracks remain
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        expect(ipod.trackCount).toBe(2);
        const tracks = ipod.getTracks();
        expect(tracks.every(t => (t.mediaType & MediaType.Audio) !== 0)).toBe(true);
      } finally {
        ipod.close();
      }
    });

    it('handles empty iPod gracefully', async () => {
      const ipod = await IpodDatabase.open(testIpod!.path);
      try {
        expect(ipod.trackCount).toBe(0);

        const musicResult = ipod.removeTracksByContentType('music', { deleteFiles: false });
        expect(musicResult.removedCount).toBe(0);
        expect(musicResult.totalCount).toBe(0);

        const videoResult = ipod.removeTracksByContentType('video', { deleteFiles: false });
        expect(videoResult.removedCount).toBe(0);
        expect(videoResult.totalCount).toBe(0);
      } finally {
        ipod.close();
      }
    });

    it('handles iPod with only music (no videos to clear)', async () => {
      // Add only music
      let ipod = await IpodDatabase.open(testIpod!.path);
      try {
        ipod.addTrack({ title: 'Song 1', artist: 'Artist 1', mediaType: MediaType.Audio });
        ipod.addTrack({ title: 'Song 2', artist: 'Artist 2', mediaType: MediaType.Audio });
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Try to clear video (should find nothing)
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        const result = ipod.removeTracksByContentType('video', { deleteFiles: false });
        expect(result.removedCount).toBe(0);
        expect(result.totalCount).toBe(0);
        expect(ipod.trackCount).toBe(2); // Music still there
      } finally {
        ipod.close();
      }
    });

    it('handles iPod with only video (no music to clear)', async () => {
      // Add only video
      let ipod = await IpodDatabase.open(testIpod!.path);
      try {
        ipod.addTrack({ title: 'Movie 1', artist: 'Director 1', mediaType: MediaType.Movie });
        ipod.addTrack({ title: 'TV Show 1', artist: 'Show 1', mediaType: MediaType.TVShow });
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Try to clear music (should find nothing)
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        const result = ipod.removeTracksByContentType('music', { deleteFiles: false });
        expect(result.removedCount).toBe(0);
        expect(result.totalCount).toBe(0);
        expect(ipod.trackCount).toBe(2); // Videos still there
      } finally {
        ipod.close();
      }
    });

    it('does not remove podcasts when clearing music', async () => {
      // Add music and podcasts
      let ipod = await IpodDatabase.open(testIpod!.path);
      try {
        ipod.addTrack({ title: 'Song 1', artist: 'Artist 1', mediaType: MediaType.Audio });
        ipod.addTrack({ title: 'Podcast 1', artist: 'Podcast Host', mediaType: MediaType.Podcast });
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Clear music - should not remove podcasts
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        const result = ipod.removeTracksByContentType('music', { deleteFiles: false });
        expect(result.removedCount).toBe(1); // Only music
        expect(ipod.trackCount).toBe(1); // Podcast remains
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Verify podcast still exists
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        const tracks = ipod.getTracks();
        expect(tracks.length).toBe(1);
        expect(tracks[0]!.title).toBe('Podcast 1');
        expect((tracks[0]!.mediaType & MediaType.Podcast) !== 0).toBe(true);
      } finally {
        ipod.close();
      }
    });

    it('does not remove audiobooks when clearing music', async () => {
      // Add music and audiobooks
      let ipod = await IpodDatabase.open(testIpod!.path);
      try {
        ipod.addTrack({ title: 'Song 1', artist: 'Artist 1', mediaType: MediaType.Audio });
        ipod.addTrack({ title: 'Audiobook 1', artist: 'Author 1', mediaType: MediaType.Audiobook });
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Clear music - should not remove audiobooks
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        const result = ipod.removeTracksByContentType('music', { deleteFiles: false });
        expect(result.removedCount).toBe(1); // Only music
        expect(ipod.trackCount).toBe(1); // Audiobook remains
        await ipod.save();
      } finally {
        ipod.close();
      }

      // Verify audiobook still exists
      ipod = await IpodDatabase.open(testIpod!.path);
      try {
        const tracks = ipod.getTracks();
        expect(tracks.length).toBe(1);
        expect(tracks[0]!.title).toBe('Audiobook 1');
        expect((tracks[0]!.mediaType & MediaType.Audiobook) !== 0).toBe(true);
      } finally {
        ipod.close();
      }
    });
  });
});
