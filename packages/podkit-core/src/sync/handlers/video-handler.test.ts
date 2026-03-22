import { describe, expect, test } from 'bun:test';
import { VideoHandler, createVideoHandler } from './video-handler.js';
import type { CollectionVideo } from '../../video/directory-adapter.js';
import type { IPodVideo } from '../video-differ.js';
import type { SyncOperation, SyncPlan } from '../types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function makeCollectionVideo(overrides: Partial<CollectionVideo> = {}): CollectionVideo {
  return {
    id: '/videos/movie.mkv',
    filePath: '/videos/movie.mkv',
    contentType: 'movie',
    title: 'Test Movie',
    year: 2024,
    container: 'mkv',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 1920,
    height: 1080,
    duration: 7200, // 2 hours in seconds
    ...overrides,
  };
}

function makeTVShowVideo(overrides: Partial<CollectionVideo> = {}): CollectionVideo {
  return makeCollectionVideo({
    id: '/videos/show/s01e01.mkv',
    filePath: '/videos/show/s01e01.mkv',
    contentType: 'tvshow',
    title: 'Pilot',
    seriesTitle: 'Test Show',
    seasonNumber: 1,
    episodeNumber: 1,
    episodeId: 'S01E01',
    duration: 2700, // 45 min
    ...overrides,
  });
}

function makeIPodVideo(overrides: Partial<IPodVideo> = {}): IPodVideo {
  return {
    id: ':iPod_Control:Music:F00:test.m4v',
    filePath: ':iPod_Control:Music:F00:test.m4v',
    contentType: 'movie',
    title: 'Test Movie',
    year: 2024,
    duration: 7200,
    bitrate: 1500,
    ...overrides,
  };
}

function makeIPodTVShow(overrides: Partial<IPodVideo> = {}): IPodVideo {
  return makeIPodVideo({
    id: ':iPod_Control:Music:F01:show.m4v',
    filePath: ':iPod_Control:Music:F01:show.m4v',
    contentType: 'tvshow',
    title: 'Pilot',
    seriesTitle: 'Test Show',
    seasonNumber: 1,
    episodeNumber: 1,
    duration: 2700,
    ...overrides,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('VideoHandler', () => {
  const handler = createVideoHandler();

  test('type is "video"', () => {
    expect(handler.type).toBe('video');
  });

  test('createVideoHandler returns VideoHandler instance', () => {
    const h = createVideoHandler();
    expect(h).toBeInstanceOf(VideoHandler);
    expect(h.type).toBe('video');
  });

  describe('generateMatchKey', () => {
    test('generates movie key with title and year', () => {
      const video = makeCollectionVideo({ title: 'Inception', year: 2010 });
      const key = handler.generateMatchKey(video);
      expect(key).toContain('movie');
      expect(key).toContain('inception');
      expect(key).toContain('2010');
    });

    test('generates TV show key with series, season, episode', () => {
      const video = makeTVShowVideo({
        seriesTitle: 'Breaking Bad',
        seasonNumber: 1,
        episodeNumber: 1,
      });
      const key = handler.generateMatchKey(video);
      expect(key).toContain('tvshow');
      expect(key).toContain('breaking bad');
      expect(key).toContain('s01e01');
    });

    test('generates consistent keys', () => {
      const video = makeCollectionVideo();
      expect(handler.generateMatchKey(video)).toBe(handler.generateMatchKey(video));
    });
  });

  describe('generateDeviceMatchKey', () => {
    test('generates key for iPod video', () => {
      const video = makeIPodVideo({ title: 'Inception', year: 2010 });
      const key = handler.generateDeviceMatchKey(video);
      expect(key).toContain('movie');
      expect(key).toContain('inception');
    });

    test('matches source key for same metadata', () => {
      const source = makeCollectionVideo({ title: 'Inception', year: 2010 });
      const device = makeIPodVideo({ title: 'Inception', year: 2010 });
      expect(handler.generateMatchKey(source)).toBe(handler.generateDeviceMatchKey(device));
    });

    test('matches TV show keys', () => {
      const source = makeTVShowVideo({ seriesTitle: 'Lost', seasonNumber: 1, episodeNumber: 1 });
      const device = makeIPodTVShow({ seriesTitle: 'Lost', seasonNumber: 1, episodeNumber: 1 });
      expect(handler.generateMatchKey(source)).toBe(handler.generateDeviceMatchKey(device));
    });
  });

  describe('getDeviceItemId', () => {
    test('returns video id', () => {
      const device = makeIPodVideo({ id: 'video-123' });
      expect(handler.getDeviceItemId(device)).toBe('video-123');
    });
  });

  describe('detectUpdates', () => {
    test('returns empty array when metadata matches', () => {
      const source = makeTVShowVideo({ seasonNumber: 1, episodeNumber: 1 });
      const device = makeIPodTVShow({ seasonNumber: 1, episodeNumber: 1 });
      const reasons = handler.detectUpdates(source, device, {});
      expect(reasons).toEqual([]);
    });

    test('detects season number correction', () => {
      const source = makeTVShowVideo({ seasonNumber: 2, episodeNumber: 1 });
      const device = makeIPodTVShow({ seasonNumber: 1, episodeNumber: 1 });
      const reasons = handler.detectUpdates(source, device, {});
      expect(reasons).toContain('metadata-correction');
    });

    test('detects episode number correction', () => {
      const source = makeTVShowVideo({ seasonNumber: 1, episodeNumber: 5 });
      const device = makeIPodTVShow({ seasonNumber: 1, episodeNumber: 3 });
      const reasons = handler.detectUpdates(source, device, {});
      expect(reasons).toContain('metadata-correction');
    });

    test('detects year correction', () => {
      const source = makeCollectionVideo({ year: 2024 });
      const device = makeIPodVideo({ year: 2023 });
      const reasons = handler.detectUpdates(source, device, {});
      expect(reasons).toContain('metadata-correction');
    });
  });

  describe('planAdd', () => {
    test('returns video-transcode operation', () => {
      const source = makeCollectionVideo();
      const op = handler.planAdd(source, {});
      expect(op.type).toBe('video-transcode');
    });

    test('includes settings with defaults', () => {
      const source = makeCollectionVideo();
      const op = handler.planAdd(source, { hardwareAcceleration: false });
      if (op.type === 'video-transcode') {
        expect(op.settings.useHardwareAcceleration).toBe(false);
        expect(op.settings.targetVideoBitrate).toBe(1500);
        expect(op.settings.targetAudioBitrate).toBe(128);
      }
    });
  });

  describe('planRemove', () => {
    test('returns video-remove operation', () => {
      const device = makeIPodVideo();
      const op = handler.planRemove(device);
      expect(op.type).toBe('video-remove');
      if (op.type === 'video-remove') {
        expect(op.video).toBe(device);
      }
    });
  });

  describe('planUpdate', () => {
    test('returns video-upgrade for preset-upgrade reason', () => {
      const source = makeCollectionVideo();
      const device = makeIPodVideo();
      const ops = handler.planUpdate(source, device, ['preset-upgrade']);
      expect(ops.length).toBe(1);
      expect(ops[0]!.type).toBe('video-upgrade');
    });

    test('returns video-update-metadata for metadata-correction', () => {
      const source = makeCollectionVideo();
      const device = makeIPodVideo();
      const ops = handler.planUpdate(source, device, ['metadata-correction']);
      expect(ops.length).toBe(1);
      expect(ops[0]!.type).toBe('video-update-metadata');
    });

    test('returns empty array for no reasons', () => {
      const source = makeCollectionVideo();
      const device = makeIPodVideo();
      const ops = handler.planUpdate(source, device, []);
      expect(ops).toEqual([]);
    });
  });

  describe('estimateSize', () => {
    test('returns positive number for video-transcode', () => {
      const op: SyncOperation = {
        type: 'video-transcode',
        source: makeCollectionVideo({ duration: 3600 }),
        settings: {
          targetVideoBitrate: 1500,
          targetAudioBitrate: 128,
          targetWidth: 640,
          targetHeight: 480,
          videoProfile: 'baseline',
          videoLevel: '3.0',
          crf: 23,
          frameRate: 30,
          useHardwareAcceleration: true,
        },
      };
      expect(handler.estimateSize(op)).toBeGreaterThan(0);
    });

    test('returns 0 for video-remove', () => {
      const op: SyncOperation = { type: 'video-remove', video: makeIPodVideo() };
      expect(handler.estimateSize(op)).toBe(0);
    });

    test('returns 0 for non-video operation', () => {
      const op: SyncOperation = {
        type: 'remove',
        track: {
          artist: 'Test',
          title: 'Test',
          album: 'Test',
          filePath: ':test',
          duration: 0,
          bitrate: 0,
          sampleRate: 0,
          size: 0,
          mediaType: 1,
          timeAdded: 0,
          timeModified: 0,
          timePlayed: 0,
          timeReleased: 0,
          playCount: 0,
          skipCount: 0,
          rating: 0,
          hasArtwork: false,
          hasFile: true,
          compilation: false,
        } as any,
      };
      expect(handler.estimateSize(op)).toBe(0);
    });
  });

  describe('estimateTime', () => {
    test('returns positive number for video-transcode', () => {
      const op: SyncOperation = {
        type: 'video-transcode',
        source: makeCollectionVideo({ duration: 3600 }),
        settings: {
          targetVideoBitrate: 1500,
          targetAudioBitrate: 128,
          targetWidth: 640,
          targetHeight: 480,
          videoProfile: 'baseline',
          videoLevel: '3.0',
          crf: 23,
          frameRate: 30,
          useHardwareAcceleration: true,
        },
      };
      expect(handler.estimateTime(op)).toBeGreaterThan(0);
    });

    test('returns 0.1 for video-remove', () => {
      const op: SyncOperation = { type: 'video-remove', video: makeIPodVideo() };
      expect(handler.estimateTime(op)).toBe(0.1);
    });
  });

  describe('getDisplayName', () => {
    test('returns title for movie', () => {
      const op: SyncOperation = {
        type: 'video-transcode',
        source: makeCollectionVideo({ title: 'Inception', year: 2010 }),
        settings: {
          targetVideoBitrate: 1500,
          targetAudioBitrate: 128,
          targetWidth: 640,
          targetHeight: 480,
          videoProfile: 'baseline',
          videoLevel: '3.0',
          crf: 23,
          frameRate: 30,
          useHardwareAcceleration: true,
        },
      };
      const name = handler.getDisplayName(op);
      expect(name).toContain('Inception');
    });

    test('returns series - episode for TV show', () => {
      const op: SyncOperation = {
        type: 'video-transcode',
        source: makeTVShowVideo({ seriesTitle: 'Breaking Bad', episodeId: 'S01E01' }),
        settings: {
          targetVideoBitrate: 1500,
          targetAudioBitrate: 128,
          targetWidth: 640,
          targetHeight: 480,
          videoProfile: 'baseline',
          videoLevel: '3.0',
          crf: 23,
          frameRate: 30,
          useHardwareAcceleration: true,
        },
      };
      const name = handler.getDisplayName(op);
      expect(name).toContain('Breaking Bad');
      expect(name).toContain('S01E01');
    });

    test('returns title for video-remove', () => {
      const op: SyncOperation = {
        type: 'video-remove',
        video: makeIPodVideo({ title: 'Old Movie' }),
      };
      expect(handler.getDisplayName(op)).toContain('Old Movie');
    });
  });

  describe('formatDryRun', () => {
    test('summarizes a video plan', () => {
      const plan: SyncPlan = {
        operations: [
          {
            type: 'video-transcode',
            source: makeCollectionVideo(),
            settings: {
              targetVideoBitrate: 1500,
              targetAudioBitrate: 128,
              targetWidth: 640,
              targetHeight: 480,
              videoProfile: 'baseline',
              videoLevel: '3.0',
              crf: 23,
              frameRate: 30,
              useHardwareAcceleration: true,
            },
          },
          { type: 'video-remove', video: makeIPodVideo() },
          {
            type: 'video-update-metadata',
            source: makeTVShowVideo(),
            video: makeIPodTVShow(),
          },
        ],
        estimatedSize: 50000000,
        estimatedTime: 600,
        warnings: [],
      };

      const summary = handler.formatDryRun(plan);
      expect(summary.toAdd).toBe(1);
      expect(summary.toRemove).toBe(1);
      expect(summary.toUpdate).toBe(1);
      expect(summary.estimatedSize).toBe(50000000);
      expect(summary.estimatedTime).toBe(600);
      expect(summary.operationCounts['video-transcode']).toBe(1);
      expect(summary.operationCounts['video-remove']).toBe(1);
      expect(summary.operationCounts['video-update-metadata']).toBe(1);
    });
  });
});
