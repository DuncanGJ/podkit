/**
 * Low-level wrapper around the gpod-tool CLI.
 *
 * These functions shell out to gpod-tool and parse JSON responses.
 * For test utilities, use the higher-level functions in test-ipod.ts.
 *
 * @module
 */

import { $ } from 'bun';
import type {
  IpodModel,
  DatabaseInfo,
  TrackInfo,
  TrackInput,
  AddTrackResult,
  VerifyResult,
} from './types';

/**
 * Error thrown when gpod-tool command fails.
 */
export class GpodToolError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'GpodToolError';
  }
}

/**
 * Check if gpod-tool is available in PATH.
 */
export async function isGpodToolAvailable(): Promise<boolean> {
  try {
    const result = await $`gpod-tool --version`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get gpod-tool version.
 */
export async function getGpodToolVersion(): Promise<string> {
  const result = await $`gpod-tool --version`.text();
  return result.trim();
}

/**
 * Initialize a new iPod database structure.
 *
 * @param path - Directory path for the iPod (will be created if needed)
 * @param options - Model and name options
 * @returns Path to the created iPod
 * @throws {GpodToolError} If initialization fails
 */
export async function init(
  path: string,
  options: { model?: IpodModel; name?: string } = {}
): Promise<{ path: string; model: string; name: string }> {
  const args: string[] = ['init', path, '--json'];

  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.name) {
    args.push('--name', options.name);
  }

  const result = await $`gpod-tool ${args}`.quiet();

  if (result.exitCode !== 0) {
    throw new GpodToolError(
      `Failed to initialize iPod at ${path}`,
      `gpod-tool ${args.join(' ')}`,
      result.exitCode,
      result.stderr.toString()
    );
  }

  const json = JSON.parse(result.stdout.toString());

  if (!json.success) {
    throw new GpodToolError(
      json.error || 'Unknown error',
      `gpod-tool ${args.join(' ')}`,
      result.exitCode,
      ''
    );
  }

  return {
    path: json.path,
    model: json.model,
    name: json.name,
  };
}

/**
 * Get information about an iPod database.
 *
 * @param path - Path to the iPod directory
 * @returns Database information
 * @throws {GpodToolError} If reading fails
 */
export async function info(path: string): Promise<DatabaseInfo> {
  const result = await $`gpod-tool info ${path} --json`.quiet();

  if (result.exitCode !== 0) {
    throw new GpodToolError(
      `Failed to read iPod info at ${path}`,
      `gpod-tool info ${path} --json`,
      result.exitCode,
      result.stderr.toString()
    );
  }

  const json = JSON.parse(result.stdout.toString());

  if (!json.success) {
    throw new GpodToolError(
      json.error || 'Unknown error',
      `gpod-tool info ${path} --json`,
      result.exitCode,
      ''
    );
  }

  return {
    path: json.path,
    device: {
      modelNumber: json.device.model_number,
      modelName: json.device.model_name,
      supportsArtwork: json.device.supports_artwork,
      supportsVideo: json.device.supports_video,
    },
    trackCount: json.track_count,
    playlistCount: json.playlist_count,
  };
}

/**
 * List all tracks in an iPod database.
 *
 * @param path - Path to the iPod directory
 * @returns Array of track information
 * @throws {GpodToolError} If reading fails
 */
export async function tracks(path: string): Promise<TrackInfo[]> {
  const result = await $`gpod-tool tracks ${path} --json`.quiet();

  if (result.exitCode !== 0) {
    throw new GpodToolError(
      `Failed to list tracks at ${path}`,
      `gpod-tool tracks ${path} --json`,
      result.exitCode,
      result.stderr.toString()
    );
  }

  const json = JSON.parse(result.stdout.toString());

  if (!json.success) {
    throw new GpodToolError(
      json.error || 'Unknown error',
      `gpod-tool tracks ${path} --json`,
      result.exitCode,
      ''
    );
  }

  return json.tracks.map(
    (t: {
      id: number;
      title: string;
      artist: string | null;
      album: string | null;
      track_number: number;
      duration_ms: number;
      bitrate: number;
      sample_rate: number;
      size: number;
      has_artwork: boolean;
    }) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      trackNumber: t.track_number,
      durationMs: t.duration_ms,
      bitrate: t.bitrate,
      sampleRate: t.sample_rate,
      size: t.size,
      hasArtwork: t.has_artwork,
    })
  );
}

/**
 * Add a track to an iPod database (metadata only, no file copy).
 *
 * @param path - Path to the iPod directory
 * @param track - Track metadata
 * @returns Added track information
 * @throws {GpodToolError} If adding fails
 */
export async function addTrack(
  path: string,
  track: TrackInput
): Promise<AddTrackResult> {
  const args: string[] = ['add-track', path, '--json', '--title', track.title];

  if (track.artist) {
    args.push('--artist', track.artist);
  }
  if (track.album) {
    args.push('--album', track.album);
  }
  if (track.trackNumber !== undefined) {
    args.push('--track-num', String(track.trackNumber));
  }
  if (track.durationMs !== undefined) {
    args.push('--duration', String(track.durationMs));
  }
  if (track.bitrate !== undefined) {
    args.push('--bitrate', String(track.bitrate));
  }
  if (track.sampleRate !== undefined) {
    args.push('--sample-rate', String(track.sampleRate));
  }

  const result = await $`gpod-tool ${args}`.quiet();

  if (result.exitCode !== 0) {
    throw new GpodToolError(
      `Failed to add track at ${path}`,
      `gpod-tool ${args.join(' ')}`,
      result.exitCode,
      result.stderr.toString()
    );
  }

  const json = JSON.parse(result.stdout.toString());

  if (!json.success) {
    throw new GpodToolError(
      json.error || 'Unknown error',
      `gpod-tool ${args.join(' ')}`,
      result.exitCode,
      ''
    );
  }

  return {
    trackId: json.track_id,
    title: json.title,
    artist: json.artist,
    album: json.album,
  };
}

/**
 * Verify an iPod database can be parsed.
 *
 * @param path - Path to the iPod directory
 * @returns Verification result
 */
export async function verify(path: string): Promise<VerifyResult> {
  const result = await $`gpod-tool verify ${path} --json`.quiet();

  const json = JSON.parse(result.stdout.toString());

  if (json.valid) {
    return {
      valid: true,
      path: json.path,
      trackCount: json.track_count,
      playlistCount: json.playlist_count,
    };
  } else {
    return {
      valid: false,
      path: path,
      trackCount: 0,
      playlistCount: 0,
      error: json.error,
    };
  }
}
