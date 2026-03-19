/**
 * Notification formatter — pure functions that produce human-readable
 * notification strings from CLI JSON output.
 */

import type { DetectedDevice } from './device-poller.js';
import type { SyncOutput } from './cli-runner.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deviceLabel(device: DetectedDevice): string {
  return device.label ?? device.name;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Format a pre-sync notification from the dry-run plan.
 *
 * Examples:
 *   "Syncing to IPOD: adding 42 tracks, removing 3 tracks, updating 1 track."
 *   "Syncing to IPOD: no changes needed."
 */
export function formatPreSyncNotification(device: DetectedDevice, dryRun: SyncOutput): string {
  const label = deviceLabel(device);
  const plan = dryRun.plan;

  if (!plan) {
    return `Syncing to ${label}.`;
  }

  const { tracksToAdd, tracksToRemove, tracksToUpdate } = plan;

  if (tracksToAdd === 0 && tracksToRemove === 0 && tracksToUpdate === 0) {
    return `Syncing to ${label}: no changes needed.`;
  }

  const parts: string[] = [];
  if (tracksToAdd > 0) {
    let addStr = `adding ${tracksToAdd} ${tracksToAdd === 1 ? 'track' : 'tracks'}`;
    // Enrich with album/artist counts when available
    const details: string[] = [];
    if (plan.albumCount) {
      details.push(`${plan.albumCount} ${plan.albumCount === 1 ? 'album' : 'albums'}`);
    }
    if (plan.artistCount) {
      details.push(`${plan.artistCount} ${plan.artistCount === 1 ? 'artist' : 'artists'}`);
    }
    if (details.length > 0) {
      addStr += ` (${details.join(' by ')})`;
    }
    parts.push(addStr);
  }
  if (tracksToRemove > 0) {
    parts.push(`removing ${tracksToRemove} ${tracksToRemove === 1 ? 'track' : 'tracks'}`);
  }
  if (tracksToUpdate > 0) {
    parts.push(`updating ${tracksToUpdate} ${tracksToUpdate === 1 ? 'track' : 'tracks'}`);
  }

  // Append video summary if present
  const vs = plan.videoSummary;
  if (vs && (vs.movieCount > 0 || vs.showCount > 0)) {
    const videoParts: string[] = [];
    if (vs.movieCount > 0) {
      videoParts.push(`${vs.movieCount} ${vs.movieCount === 1 ? 'movie' : 'movies'}`);
    }
    if (vs.showCount > 0) {
      videoParts.push(
        `${vs.showCount} ${vs.showCount === 1 ? 'TV show' : 'TV shows'} (${vs.episodeCount} ${vs.episodeCount === 1 ? 'episode' : 'episodes'})`
      );
    }
    parts.push(videoParts.join(', '));
  }

  return `Syncing to ${label}: ${parts.join(', ')}.`;
}

/**
 * Format a post-sync notification from the sync result.
 *
 * Examples:
 *   "IPOD sync complete: 42 tracks added. Duration: 2m 15s. Safe to unplug."
 *   "IPOD sync completed with errors: 40 succeeded, 2 failed. Duration: 2m 15s."
 */
export function formatPostSyncNotification(device: DetectedDevice, result: SyncOutput): string {
  const label = deviceLabel(device);
  const r = result.result;

  if (!r) {
    return `${label} sync complete.`;
  }

  const duration = formatDuration(r.duration);

  if (r.failed > 0) {
    return `${label} sync completed with errors: ${r.completed} succeeded, ${r.failed} failed. Duration: ${duration}.`;
  }

  return `${label} sync complete: ${r.completed} ${r.completed === 1 ? 'track' : 'tracks'} added. Duration: ${duration}. Safe to unplug.`;
}

/**
 * Format an error notification.
 *
 * Example:
 *   "IPOD sync failed at mount: device busy. Check container logs for details."
 */
export function formatErrorNotification(
  device: DetectedDevice,
  stage: string,
  error: string
): string {
  const label = deviceLabel(device);
  return `${label} sync failed at ${stage}: ${error}. Check container logs for details.`;
}

// ---------------------------------------------------------------------------
// Duration formatting
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
