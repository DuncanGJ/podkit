/**
 * Add-device command - scan for and register an iPod for auto-mount
 *
 * This command scans for attached iPods and saves the selected device's
 * Volume UUID to the config file for automatic detection during mount.
 *
 * @example
 * ```bash
 * podkit add-device          # Scan and register interactively
 * podkit add-device --json   # JSON output (no confirmation)
 * ```
 */
import { Command } from 'commander';
import * as readline from 'node:readline';
import { getContext } from '../context.js';
import { updateIpodIdentity, removeDeviceField, DEFAULT_CONFIG_PATH } from '../config/index.js';
import { formatBytes } from './status.js';

/**
 * Output structure for JSON format
 */
export interface AddDeviceOutput {
  success: boolean;
  device?: {
    identifier: string;
    volumeName: string;
    volumeUuid: string;
    size: number;
    isMounted: boolean;
    mountPoint?: string;
  };
  saved?: boolean;
  configPath?: string;
  error?: string;
}

/**
 * Prompt user for yes/no confirmation
 */
async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      // Default to yes if empty
      resolve(normalized === '' || normalized === 'y' || normalized === 'yes');
    });
  });
}

export const addDeviceCommand = new Command('add-device')
  .description('scan for attached iPods and save to config for auto-mount')
  .action(async () => {
    const { globalOpts, configResult } = getContext();

    const outputJson = (data: AddDeviceOutput) => {
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
      const error = `Device scanning is not supported on ${manager.platform}.`;
      if (globalOpts.json) {
        outputJson({ success: false, error });
      } else {
        console.error(error);
        console.error('');
        console.error(manager.getManualInstructions('mount'));
      }
      process.exitCode = 1;
      return;
    }

    // Scan for iPods
    if (!globalOpts.quiet && !globalOpts.json) {
      console.log('Scanning for attached iPods...');
    }

    const ipods = await manager.findIpodDevices();

    if (ipods.length === 0) {
      if (globalOpts.json) {
        outputJson({
          success: false,
          error: 'No iPod devices found',
        });
      } else {
        console.error('No iPod devices found.');
        console.error('');
        console.error('Make sure your iPod is connected and mounted.');
        console.error(
          'If using an iFlash adapter, the iPod may need to be mounted manually first.'
        );
      }
      process.exitCode = 1;
      return;
    }

    // Use the first iPod found (could add selection UI later)
    const ipod = ipods[0]!;

    // Build output data
    const deviceInfo = {
      identifier: ipod.identifier,
      volumeName: ipod.volumeName,
      volumeUuid: ipod.volumeUuid,
      size: ipod.size,
      isMounted: ipod.isMounted,
      mountPoint: ipod.mountPoint,
    };

    // JSON mode: output without confirmation
    if (globalOpts.json) {
      // Save to config automatically in JSON mode
      const configPath = configResult.configPath ?? DEFAULT_CONFIG_PATH;
      const result = updateIpodIdentity(
        {
          volumeUuid: ipod.volumeUuid,
          volumeName: ipod.volumeName,
        },
        { configPath }
      );

      // Remove legacy device field (UUID takes over)
      if (result.success) {
        removeDeviceField({ configPath });
      }

      outputJson({
        success: result.success,
        device: deviceInfo,
        saved: result.success,
        configPath: result.configPath,
        error: result.error,
      });

      if (!result.success) {
        process.exitCode = 1;
      }
      return;
    }

    // Interactive mode: show device info and confirm
    console.log('');
    console.log('Found attached iPod:');
    console.log(`  Name:        ${ipod.volumeName || '(unnamed)'}`);
    console.log(`  Size:        ${formatBytes(ipod.size)}`);
    console.log(`  Volume UUID: ${ipod.volumeUuid}`);
    console.log(`  Mounted:     ${ipod.isMounted ? 'Yes' : 'No'}`);
    if (ipod.mountPoint) {
      console.log(`  Mount point: ${ipod.mountPoint}`);
    }
    console.log(`  Device:      /dev/${ipod.identifier}`);
    console.log('');

    // Check if there's already an iPod in config
    const existingConfig = configResult.config;
    if (existingConfig.ipod) {
      console.log(`Note: Config already has an iPod registered:`);
      console.log(`  Current: ${existingConfig.ipod.volumeName} (${existingConfig.ipod.volumeUuid})`);
      console.log('');
    }

    // Ask for confirmation
    const shouldSave = await confirm('Save this iPod to config for auto-mount? [Y/n] ');

    if (!shouldSave) {
      console.log('Cancelled. No changes made.');
      return;
    }

    // Save to config
    const configPath = configResult.configPath ?? DEFAULT_CONFIG_PATH;
    const result = updateIpodIdentity(
      {
        volumeUuid: ipod.volumeUuid,
        volumeName: ipod.volumeName,
      },
      { configPath }
    );

    if (!result.success) {
      console.error(`Failed to save config: ${result.error}`);
      process.exitCode = 1;
      return;
    }

    // Remove legacy device field (UUID takes over)
    removeDeviceField({ configPath });

    console.log('');
    if (result.created) {
      console.log(`Created config file: ${result.configPath}`);
    } else {
      console.log(`Updated config file: ${result.configPath}`);
    }
    console.log('');
    console.log('iPod saved to config. You can now use:');
    console.log('  sudo podkit mount     # Mount this iPod');
    console.log('  podkit eject          # Safely eject after use');
  });
