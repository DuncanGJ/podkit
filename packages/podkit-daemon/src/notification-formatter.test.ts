import { describe, it, expect } from 'bun:test';
import {
  formatPreSyncNotification,
  formatPostSyncNotification,
  formatErrorNotification,
} from './notification-formatter.js';
import type { DetectedDevice } from './device-poller.js';
import type { SyncOutput } from './cli-runner.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDevice(overrides?: Partial<DetectedDevice>): DetectedDevice {
  return {
    name: 'sdb1',
    disk: '/dev/sdb1',
    uuid: 'ABCD-1234',
    label: 'IPOD',
    size: 160_000_000_000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formatPreSyncNotification
// ---------------------------------------------------------------------------

describe('formatPreSyncNotification', () => {
  it('formats notification with tracks to add, remove, and update', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
      plan: { tracksToAdd: 10, tracksToRemove: 2, tracksToUpdate: 1, tracksExisting: 50 },
    };

    const result = formatPreSyncNotification(makeDevice(), dryRun);

    expect(result).toBe('Syncing to IPOD: adding 10 tracks, removing 2 tracks, updating 1 track.');
  });

  it('formats notification with only removals (metadata-only update)', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
      plan: { tracksToAdd: 0, tracksToRemove: 5, tracksToUpdate: 0, tracksExisting: 50 },
    };

    const result = formatPreSyncNotification(makeDevice(), dryRun);

    expect(result).toBe('Syncing to IPOD: removing 5 tracks.');
  });

  it('formats notification when no changes are needed', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
      plan: { tracksToAdd: 0, tracksToRemove: 0, tracksToUpdate: 0, tracksExisting: 50 },
    };

    const result = formatPreSyncNotification(makeDevice(), dryRun);

    expect(result).toBe('Syncing to IPOD: no changes needed.');
  });

  it('formats notification with only additions', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
      plan: { tracksToAdd: 42, tracksToRemove: 0, tracksToUpdate: 0, tracksExisting: 0 },
    };

    const result = formatPreSyncNotification(makeDevice(), dryRun);

    expect(result).toBe('Syncing to IPOD: adding 42 tracks.');
  });

  it('handles singular track counts', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
      plan: { tracksToAdd: 1, tracksToRemove: 1, tracksToUpdate: 1, tracksExisting: 0 },
    };

    const result = formatPreSyncNotification(makeDevice(), dryRun);

    expect(result).toBe('Syncing to IPOD: adding 1 track, removing 1 track, updating 1 track.');
  });

  it('handles missing plan gracefully', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
    };

    const result = formatPreSyncNotification(makeDevice(), dryRun);

    expect(result).toBe('Syncing to IPOD.');
  });

  it('falls back to device name when label is absent', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
      plan: { tracksToAdd: 5, tracksToRemove: 0, tracksToUpdate: 0, tracksExisting: 0 },
    };

    const result = formatPreSyncNotification(makeDevice({ label: undefined }), dryRun);

    expect(result).toBe('Syncing to sdb1: adding 5 tracks.');
  });

  it('includes album and artist counts when available', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
      plan: {
        tracksToAdd: 47,
        tracksToRemove: 3,
        tracksToUpdate: 0,
        tracksExisting: 100,
        albumCount: 12,
        artistCount: 5,
      },
    };

    const result = formatPreSyncNotification(makeDevice(), dryRun);

    expect(result).toBe(
      'Syncing to IPOD: adding 47 tracks (12 albums by 5 artists), removing 3 tracks.'
    );
  });

  it('includes video summary when present', () => {
    const dryRun: SyncOutput = {
      success: true,
      dryRun: true,
      plan: {
        tracksToAdd: 5,
        tracksToRemove: 0,
        tracksToUpdate: 0,
        tracksExisting: 0,
        videoSummary: { movieCount: 2, showCount: 1, episodeCount: 8 },
      },
    };

    const result = formatPreSyncNotification(makeDevice(), dryRun);

    expect(result).toBe('Syncing to IPOD: adding 5 tracks, 2 movies, 1 TV show (8 episodes).');
  });
});

// ---------------------------------------------------------------------------
// formatPostSyncNotification
// ---------------------------------------------------------------------------

describe('formatPostSyncNotification', () => {
  it('formats successful sync notification', () => {
    const result: SyncOutput = {
      success: true,
      dryRun: false,
      result: { completed: 42, failed: 0, duration: 135.2 },
    };

    const notification = formatPostSyncNotification(makeDevice(), result);

    expect(notification).toBe(
      'IPOD sync complete: 42 tracks added. Duration: 2m 15s. Safe to unplug.'
    );
  });

  it('formats sync with failures', () => {
    const result: SyncOutput = {
      success: true,
      dryRun: false,
      result: { completed: 40, failed: 2, duration: 120 },
    };

    const notification = formatPostSyncNotification(makeDevice(), result);

    expect(notification).toBe(
      'IPOD sync completed with errors: 40 succeeded, 2 failed. Duration: 2m.'
    );
  });

  it('formats short duration in seconds', () => {
    const result: SyncOutput = {
      success: true,
      dryRun: false,
      result: { completed: 3, failed: 0, duration: 8.5 },
    };

    const notification = formatPostSyncNotification(makeDevice(), result);

    expect(notification).toBe(
      'IPOD sync complete: 3 tracks added. Duration: 8.5s. Safe to unplug.'
    );
  });

  it('handles singular track count', () => {
    const result: SyncOutput = {
      success: true,
      dryRun: false,
      result: { completed: 1, failed: 0, duration: 2.1 },
    };

    const notification = formatPostSyncNotification(makeDevice(), result);

    expect(notification).toBe('IPOD sync complete: 1 track added. Duration: 2.1s. Safe to unplug.');
  });

  it('handles missing result gracefully', () => {
    const result: SyncOutput = {
      success: true,
      dryRun: false,
    };

    const notification = formatPostSyncNotification(makeDevice(), result);

    expect(notification).toBe('IPOD sync complete.');
  });

  it('falls back to device name when label is absent', () => {
    const result: SyncOutput = {
      success: true,
      dryRun: false,
      result: { completed: 5, failed: 0, duration: 10 },
    };

    const notification = formatPostSyncNotification(makeDevice({ label: undefined }), result);

    expect(notification).toContain('sdb1 sync complete');
  });
});

// ---------------------------------------------------------------------------
// formatErrorNotification
// ---------------------------------------------------------------------------

describe('formatErrorNotification', () => {
  it('formats mount error', () => {
    const result = formatErrorNotification(makeDevice(), 'mount', 'device busy');

    expect(result).toBe(
      'IPOD sync failed at mount: device busy. Check container logs for details.'
    );
  });

  it('formats sync error', () => {
    const result = formatErrorNotification(makeDevice(), 'sync', 'transcode failed');

    expect(result).toBe(
      'IPOD sync failed at sync: transcode failed. Check container logs for details.'
    );
  });

  it('formats eject error', () => {
    const result = formatErrorNotification(makeDevice(), 'eject', 'already unplugged');

    expect(result).toBe(
      'IPOD sync failed at eject: already unplugged. Check container logs for details.'
    );
  });

  it('falls back to device name when label is absent', () => {
    const result = formatErrorNotification(
      makeDevice({ label: undefined }),
      'mount',
      'device busy'
    );

    expect(result).toBe(
      'sdb1 sync failed at mount: device busy. Check container logs for details.'
    );
  });
});
