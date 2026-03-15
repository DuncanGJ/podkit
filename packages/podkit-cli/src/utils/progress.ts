/**
 * Progress display utilities for CLI output
 *
 * Provides consistent progress line formatting and track name truncation
 * for both audio and video transcoding operations. Automatically adapts
 * to terminal width to prevent line wrapping.
 */

/**
 * Options for formatting a progress line
 */
export interface ProgressLineOptions {
  /** Progress bar string (e.g., "[====>    ] 50%") */
  bar: string;
  /** Phase description (e.g., "Transcoding", "Copying") */
  phase: string;
  /** Track name to display (will be truncated to fit terminal) */
  trackName?: string;
  /** Encoding speed multiplier (e.g., 1.5 for 1.5x) */
  speed?: number;
  /** Override terminal width (defaults to process.stdout.columns or 80) */
  terminalWidth?: number;
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed.
 */
export function truncateTrackName(name: string | undefined, maxLength = 40): string {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}

/**
 * Get the current terminal width, with a sensible default.
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * Format a progress line for CLI output with carriage return
 *
 * Creates a progress line that overwrites the previous line using `\r\x1b[K`.
 * Automatically fits the output to the terminal width by truncating the track
 * name to fill available space. If the terminal is too narrow for even a short
 * track name, the name is omitted entirely.
 *
 * @param options - Progress line formatting options
 * @returns Formatted progress line ready for `process.stdout.write()`
 */
export function formatProgressLine({
  bar,
  phase,
  trackName,
  speed,
  terminalWidth,
}: ProgressLineOptions): string {
  const width = terminalWidth ?? getTerminalWidth();
  const speedStr = speed ? ` (${speed.toFixed(1)}x)` : '';

  // Base line without track name: "bar phase(speed)"
  const baseLength = bar.length + 1 + phase.length + speedStr.length;

  if (!trackName) {
    return `\r\x1b[K${bar} ${phase}${speedStr}`;
  }

  // Track name adds ": name" (2 chars for ": " prefix)
  const availableForTrack = width - baseLength - 2;

  // Need at least 4 chars to show anything meaningful (e.g., "S...")
  if (availableForTrack < 4) {
    return `\r\x1b[K${bar} ${phase}${speedStr}`;
  }

  const truncated = truncateTrackName(trackName, availableForTrack);
  return `\r\x1b[K${bar} ${phase}${speedStr}: ${truncated}`;
}
