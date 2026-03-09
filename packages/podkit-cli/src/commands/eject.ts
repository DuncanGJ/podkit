/**
 * Eject command - safely unmount an iPod device
 *
 * This command safely unmounts the iPod device, flushing all pending
 * writes and making it safe to disconnect.
 *
 * @example
 * ```bash
 * podkit eject                        # Auto-detects via Volume UUID
 * podkit eject -d terapod             # Use named device from config
 * podkit eject --device /Volumes/iPod # Explicit device
 * podkit eject --force                # Force unmount if busy
 * podkit eject --json                 # JSON output
 * ```
 */
import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { getContext } from '../context.js';
import {
  resolveDevicePath,
  formatDeviceError,
  resolveDeviceFromConfig,
  getDeviceIdentity,
  formatDeviceNotFoundError,
} from '../device-resolver.js';

/**
 * Output structure for JSON format
 */
export interface EjectOutput {
  success: boolean;
  device?: string;
  forced?: boolean;
  error?: string;
}

interface EjectOptions {
  force?: boolean;
  deviceName?: string;
}

export const ejectCommand = new Command('eject')
  .description('safely unmount an iPod device')
  .option('-d, --device-name <name>', 'device name from config')
  .option('-f, --force', 'force unmount even if device is busy')
  .action(async (options: EjectOptions) => {
    const { config, globalOpts } = getContext();
    const force = options.force ?? false;

    const outputJson = (data: EjectOutput) => {
      console.log(JSON.stringify(data, null, 2));
    };

    // Dynamically import to handle platform-specific errors
    let getDeviceManager: typeof import('@podkit/core').getDeviceManager;

    try {
      const core = await import('@podkit/core');
      getDeviceManager = core.getDeviceManager;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load podkit-core';
      if (globalOpts.json) {
        outputJson({ success: false, error: message });
      } else {
        console.error('Failed to load podkit-core.');
        if (globalOpts.verbose) {
          console.error('Details:', message);
        }
      }
      process.exitCode = 1;
      return;
    }

    const manager = getDeviceManager();

    // Check platform support
    if (!manager.isSupported) {
      if (globalOpts.json) {
        outputJson({
          success: false,
          error: `Eject is not supported on ${manager.platform}`,
        });
      } else {
        console.error(`Eject is not supported on ${manager.platform}.`);
        console.error('');
        console.error(manager.getManualInstructions('eject'));
      }
      process.exitCode = 1;
      return;
    }

    // Resolve named device (if -d flag used)
    const resolvedDevice = options.deviceName
      ? resolveDeviceFromConfig(config, options.deviceName)
      : resolveDeviceFromConfig(config); // Try default device

    // Check if named device was requested but not found
    if (options.deviceName && !resolvedDevice) {
      const errorMsg = formatDeviceNotFoundError(options.deviceName, config);
      if (globalOpts.json) {
        outputJson({
          success: false,
          error: errorMsg,
        });
      } else {
        console.error(errorMsg);
      }
      process.exitCode = 1;
      return;
    }

    // Resolve device path (CLI flag > named device UUID)
    const deviceIdentity = getDeviceIdentity(resolvedDevice);

    if (!globalOpts.quiet && !globalOpts.json && deviceIdentity?.volumeUuid) {
      console.log(`Looking for iPod...`);
    }

    const resolved = await resolveDevicePath({
      cliDevice: globalOpts.device,
      deviceIdentity,
      manager,
      requireMounted: true,
      quiet: globalOpts.quiet,
    });

    if (!resolved.path) {
      if (globalOpts.json) {
        outputJson({
          success: false,
          error: resolved.error ?? formatDeviceError(resolved),
        });
      } else {
        console.error(resolved.error ?? formatDeviceError(resolved));
      }
      process.exitCode = 1;
      return;
    }

    const devicePath = resolved.path;

    // Verify path exists
    if (!existsSync(devicePath)) {
      if (globalOpts.json) {
        outputJson({
          success: false,
          device: devicePath,
          error: `Device path not found: ${devicePath}`,
        });
      } else {
        console.error(`iPod not found at: ${devicePath}`);
        console.error('');
        console.error('Make sure the iPod is connected and mounted.');
      }
      process.exitCode = 1;
      return;
    }

    // Show progress message
    if (!globalOpts.quiet && !globalOpts.json) {
      console.log(`Ejecting iPod at ${devicePath}...`);
    }

    // Perform eject
    const result = await manager.eject(devicePath, { force });

    if (result.success) {
      if (globalOpts.json) {
        outputJson({
          success: true,
          device: devicePath,
          forced: result.forced,
        });
      } else if (!globalOpts.quiet) {
        console.log('iPod ejected successfully. Safe to disconnect.');
      }
    } else {
      if (globalOpts.json) {
        outputJson({
          success: false,
          device: devicePath,
          forced: result.forced,
          error: result.error,
        });
      } else {
        console.error('Failed to eject iPod.');
        console.error('');
        if (result.error) {
          console.error(result.error);
        }
        if (!force) {
          console.error('');
          console.error('Try: podkit eject --force');
        }
      }
      process.exitCode = 1;
    }
  });
