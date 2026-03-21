/**
 * Graceful shutdown controller for CLI commands.
 *
 * Manages SIGINT/SIGTERM signal handling via AbortController.
 * First signal triggers graceful shutdown; second signal force-quits.
 */

export interface ShutdownController {
  /** AbortSignal that consumers can pass to executors */
  signal: AbortSignal;
  /** Register signal handlers. Call once per command invocation. */
  install(): void;
  /** Unregister signal handlers. Call in finally block. */
  uninstall(): void;
  /** True after first signal received */
  readonly isShuttingDown: boolean;
}

const DEFAULT_MESSAGE = 'Graceful shutdown requested. Finishing current operation...';

export function createShutdownController(options?: {
  /** Custom message on first signal */
  message?: string;
  /** Callback when shutdown starts (e.g., update progress display) */
  onShutdown?: () => void;
}): ShutdownController {
  const message = options?.message ?? DEFAULT_MESSAGE;
  const onShutdown = options?.onShutdown;

  const ac = new AbortController();
  let shuttingDown = false;
  let installed = false;

  const handler = () => {
    if (shuttingDown) {
      // Second signal — force quit
      process.stderr.write('\nForce quit.\n');
      process.exit(130);
    }

    shuttingDown = true;
    ac.abort();
    process.stderr.write('\n' + message + '\n');
    onShutdown?.();
  };

  return {
    get signal() {
      return ac.signal;
    },

    get isShuttingDown() {
      return shuttingDown;
    },

    install() {
      if (installed) return;
      installed = true;
      process.on('SIGINT', handler);
      process.on('SIGTERM', handler);
    },

    uninstall() {
      if (!installed) return;
      installed = false;
      process.removeListener('SIGINT', handler);
      process.removeListener('SIGTERM', handler);
    },
  };
}
