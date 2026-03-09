/**
 * Progress display utilities for CLI output
 *
 * Provides consistent progress line formatting and track name truncation
 * for both audio and video transcoding operations.
 */

/**
 * Options for formatting a progress line
 */
export interface ProgressLineOptions {
  /** Progress bar string (e.g., "[====>    ] 50%") */
  bar: string;
  /** Phase description (e.g., "Transcoding", "Copying") */
  phase: string;
  /** Track name to display (will be truncated) */
  trackName?: string;
  /** Encoding speed multiplier (e.g., 1.5 for 1.5x) */
  speed?: number;
  /** Maximum length for track name before truncation */
  maxTrackLength?: number;
}

/**
 * Truncate a track name to a maximum length
 *
 * @param name - Track name to truncate
 * @param maxLength - Maximum length (default: 40)
 * @returns Truncated track name, or empty string if no name provided
 *
 * @example
 * ```typescript
 * truncateTrackName('Very Long Movie Title (2020)', 20)
 * // => 'Very Long Movie T...'
 * ```
 */
export function truncateTrackName(name: string | undefined, maxLength = 40): string {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}

/**
 * Format a progress line for CLI output with carriage return
 *
 * Creates a progress line that overwrites the previous line using `\r\x1b[K`.
 * Automatically truncates track names to prevent terminal wrapping.
 *
 * @param options - Progress line formatting options
 * @returns Formatted progress line ready for `process.stdout.write()`
 *
 * @example
 * ```typescript
 * const line = formatProgressLine({
 *   bar: '[====>    ] 50%',
 *   phase: 'Transcoding',
 *   trackName: 'Song Title',
 *   speed: 1.5,
 * });
 * process.stdout.write(line);
 * ```
 */
export function formatProgressLine({
  bar,
  phase,
  trackName,
  speed,
  maxTrackLength = 40,
}: ProgressLineOptions): string {
  const speedStr = speed ? ` (${speed.toFixed(1)}x)` : '';
  const truncated = truncateTrackName(trackName, maxTrackLength);
  const trackStr = truncated ? `: ${truncated}` : '';
  return `\r\x1b[K${bar} ${phase}${speedStr}${trackStr}`;
}
