/**
 * Simple structured logging for docker logs.
 *
 * Outputs timestamped, level-prefixed lines to stdout/stderr so that
 * `docker logs` shows a clean, parseable stream.
 */

type LogLevel = 'info' | 'warn' | 'error';

const LEVEL_LABELS: Record<LogLevel, string> = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

/**
 * Write a structured log line to stdout (info/warn) or stderr (error).
 *
 * Format: `[ISO-timestamp] [LEVEL] message { json-data }`
 */
export function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const label = LEVEL_LABELS[level];
  const suffix = data ? ` ${JSON.stringify(data)}` : '';
  const line = `[${timestamp}] [${label}] ${message}${suffix}\n`;

  if (level === 'error') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}
