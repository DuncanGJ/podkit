/**
 * Apprise notification client.
 *
 * Sends notifications via the Apprise REST API. When no URL is configured,
 * returns a no-op client so callers don't need to check.
 *
 * Failures are logged but never thrown — notifications must never block
 * or interrupt the sync cycle.
 */

import { log } from './logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppriseClient {
  notify(title: string, body: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Create an Apprise client.
 *
 * When `url` is undefined, returns a no-op client that silently succeeds.
 */
export function createAppriseClient(url: string | undefined): AppriseClient {
  if (!url) {
    return { notify: async () => {} };
  }

  return {
    notify: async (title: string, body: string): Promise<void> => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          log('warn', `Apprise notification failed: HTTP ${response.status}`, {
            title,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log('warn', `Apprise notification error: ${message}`, { title });
      }
    },
  };
}
