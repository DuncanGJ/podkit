/**
 * FFmpeg progress parsing utilities
 *
 * Provides shared parsing functions for FFmpeg progress output
 * used by both audio and video transcoding.
 */

import type { TranscodeProgress } from './types.js';

/**
 * Parse FFmpeg time string format (HH:MM:SS.mmm)
 *
 * @param timeStr - Time string in HH:MM:SS.mmm format
 * @returns Time in seconds, or null if invalid
 *
 * @example
 * ```typescript
 * parseTimeString('00:01:23.456')  // => 83.456
 * parseTimeString('invalid')        // => null
 * ```
 */
export function parseTimeString(timeStr: string): number | null {
  const match = timeStr.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const [, hours, minutes, seconds] = match;
  const h = parseInt(hours!, 10);
  const m = parseInt(minutes!, 10);
  const s = parseFloat(seconds!);

  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;

  return h * 3600 + m * 60 + s;
}

/**
 * Parse a single FFmpeg progress line (key=value format)
 *
 * Extracts progress information from a single line of FFmpeg output.
 * FFmpeg outputs progress in key=value format when using `-progress pipe:N`.
 *
 * @param line - Single line of FFmpeg progress output
 * @returns Partial progress data, or null if line doesn't contain useful data
 *
 * @example
 * ```typescript
 * parseFFmpegProgressLine('out_time_ms=5000000')
 * // => { time: 5 }
 *
 * parseFFmpegProgressLine('speed=1.5x')
 * // => { speed: 1.5 }
 * ```
 */
export function parseFFmpegProgressLine(line: string): Partial<TranscodeProgress> | null {
  const match = line.match(/^(\w+)=(.+)$/);
  if (!match) return null;

  const [, key, value] = match;
  const result: Partial<TranscodeProgress> = {};

  switch (key) {
    case 'out_time_ms':
      // Time in microseconds
      const timeUs = parseInt(value!, 10);
      if (!isNaN(timeUs)) {
        result.time = timeUs / 1_000_000;
        return result;
      }
      break;

    case 'out_time':
      // Time in HH:MM:SS.mmm format (fallback)
      const timeSec = parseTimeString(value!);
      if (timeSec !== null) {
        result.time = timeSec;
        return result;
      }
      break;

    case 'frame':
      const frame = parseInt(value!, 10);
      if (!isNaN(frame)) {
        result.frame = frame;
        return result;
      }
      break;

    case 'speed':
      // Speed like "1.5x" or "0.5x"
      const speedMatch = value!.match(/^(\d+\.?\d*)x$/);
      if (speedMatch) {
        result.speed = parseFloat(speedMatch[1]!);
        return result;
      }
      break;

    case 'bitrate':
      // Bitrate like "2000.0kbits/s"
      const bitrateMatch = value!.match(/^(\d+\.?\d*)kbits\/s$/);
      if (bitrateMatch) {
        result.bitrate = Math.round(parseFloat(bitrateMatch[1]!));
        return result;
      }
      break;

    case 'progress':
      // 'continue' or 'end' - not useful data
      return null;
  }

  return null;
}

/**
 * Parse FFmpeg progress output (chunk of multiple lines)
 *
 * Parses a chunk of FFmpeg progress output and extracts all available fields.
 * Automatically calculates progress percentage if duration is provided.
 *
 * @param chunk - Chunk of FFmpeg stderr/stdout output
 * @param duration - Total duration in seconds (optional, for percent calculation)
 * @returns Partial progress data, or null if no useful data found
 *
 * @example
 * ```typescript
 * const chunk = 'out_time_ms=5000000\nspeed=1.5x\n';
 * parseFFmpegProgress(chunk, 10)
 * // => { time: 5, duration: 10, percent: 50, speed: 1.5 }
 * ```
 */
export function parseFFmpegProgress(
  chunk: string,
  duration?: number
): Partial<TranscodeProgress> | null {
  const result: Partial<TranscodeProgress> = {};
  let hasData = false;

  const lines = chunk.split('\n');
  for (const line of lines) {
    const lineData = parseFFmpegProgressLine(line);
    if (lineData) {
      Object.assign(result, lineData);
      hasData = true;
    }
  }

  if (!hasData) return null;

  // Calculate progress percentage if we have time and duration
  if (result.time !== undefined && duration !== undefined && duration > 0) {
    result.duration = duration;
    result.percent = Math.min(100, (result.time / duration) * 100);
  }

  return result;
}
