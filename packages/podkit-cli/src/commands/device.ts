/**
 * Device command - manage iPod devices in the config
 *
 * This command provides subcommands for listing, adding, removing, and showing
 * device configurations.
 *
 * @example
 * ```bash
 * podkit device                 # list configured devices (default action)
 * podkit device list            # same as above
 * podkit device add <name>      # detect connected iPod, save to config
 * podkit device remove <name>   # remove device from config
 * podkit device show <name>     # display device config details
 * ```
 */
import { Command } from 'commander';
import * as readline from 'node:readline';
import { getContext } from '../context.js';
import {
  addDevice,
  removeDevice,
  setDefaultDevice,
  DEFAULT_CONFIG_PATH,
} from '../config/index.js';
import { formatBytes } from './status.js';
import type { DeviceConfig } from '../config/index.js';

/**
 * Output structure for JSON format (device list)
 */
export interface DeviceListOutput {
  success: boolean;
  devices: Array<{
    name: string;
    isDefault: boolean;
    volumeUuid: string;
    volumeName: string;
    quality?: string;
    videoQuality?: string;
    artwork?: boolean;
  }>;
  defaultDevice?: string;
  error?: string;
}

/**
 * Output structure for device add
 */
export interface DeviceAddOutput {
  success: boolean;
  device?: {
    name: string;
    identifier: string;
    volumeName: string;
    volumeUuid: string;
    size: number;
    isMounted: boolean;
    mountPoint?: string;
  };
  saved?: boolean;
  configPath?: string;
  isDefault?: boolean;
  error?: string;
}

/**
 * Output structure for device remove
 */
export interface DeviceRemoveOutput {
  success: boolean;
  device?: string;
  wasDefault?: boolean;
  error?: string;
}

/**
 * Output structure for device show
 */
export interface DeviceShowOutput {
  success: boolean;
  device?: {
    name: string;
    volumeUuid: string;
    volumeName: string;
    quality?: string;
    videoQuality?: string;
    artwork?: boolean;
    transforms?: Record<string, unknown>;
    isDefault: boolean;
  };
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

/**
 * Prompt user for no/yes confirmation (defaults to no)
 */
async function confirmNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Format a table row with consistent column widths
 */
function formatRow(columns: string[], widths: number[]): string {
  return columns.map((col, i) => col.padEnd(widths[i] || 10)).join('  ');
}

// ============================================================================
// List subcommand
// ============================================================================

const listSubcommand = new Command('list')
  .description('list configured devices')
  .action(async () => {
    const { config, globalOpts } = getContext();

    const outputJson = (data: DeviceListOutput) => {
      console.log(JSON.stringify(data, null, 2));
    };

    const devices = config.devices || {};
    const defaultDevice = config.defaults?.device;
    const deviceNames = Object.keys(devices);

    if (deviceNames.length === 0) {
      if (globalOpts.json) {
        outputJson({
          success: true,
          devices: [],
          defaultDevice: undefined,
        });
      } else {
        console.log("No devices configured. Run 'podkit device add <name>' to add one.");
      }
      return;
    }

    if (globalOpts.json) {
      const deviceList = deviceNames.map((name) => {
        const device = devices[name]!;
        return {
          name,
          isDefault: name === defaultDevice,
          volumeUuid: device.volumeUuid,
          volumeName: device.volumeName,
          quality: device.quality,
          videoQuality: device.videoQuality,
          artwork: device.artwork,
        };
      });

      outputJson({
        success: true,
        devices: deviceList,
        defaultDevice,
      });
      return;
    }

    // Human-readable table output
    console.log('Configured devices:');
    console.log('');

    // Calculate column widths
    const headers = ['NAME', 'VOLUME', 'QUALITY', 'VIDEO', 'ARTWORK'];
    const widths = [
      Math.max(6, ...deviceNames.map((n) => n.length + 2)), // +2 for "* " prefix
      Math.max(8, ...deviceNames.map((n) => (devices[n]?.volumeName || '').length)),
      8,
      6,
      7,
    ];

    // Header row
    console.log('  ' + formatRow(headers, widths));

    // Device rows
    for (const name of deviceNames) {
      const device = devices[name]!;
      const isDefault = name === defaultDevice;
      const prefix = isDefault ? '* ' : '  ';

      const row = formatRow(
        [
          name,
          device.volumeName || '-',
          device.quality || '-',
          device.videoQuality || '-',
          device.artwork === true ? 'yes' : device.artwork === false ? 'no' : '-',
        ],
        widths
      );

      console.log(prefix + row);
    }

    console.log('');
    console.log('* = default device');
  });

// ============================================================================
// Add subcommand
// ============================================================================

const addSubcommand = new Command('add')
  .description('detect connected iPod and add to config')
  .argument('<name>', 'name for this device configuration')
  .action(async (name: string) => {
    const { globalOpts, configResult } = getContext();

    const outputJson = (data: DeviceAddOutput) => {
      console.log(JSON.stringify(data, null, 2));
    };

    // Validate name (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      const error =
        'Invalid device name. Must start with a letter and contain only letters, numbers, hyphens, and underscores.';
      if (globalOpts.json) {
        outputJson({ success: false, error });
      } else {
        console.error(error);
      }
      process.exitCode = 1;
      return;
    }

    // Check if device already exists
    const existingDevices = configResult.config.devices || {};
    if (name in existingDevices) {
      const error = `Device "${name}" already exists in config. Use a different name or remove it first.`;
      if (globalOpts.json) {
        outputJson({ success: false, error });
      } else {
        console.error(error);
      }
      process.exitCode = 1;
      return;
    }

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
      name,
      identifier: ipod.identifier,
      volumeName: ipod.volumeName,
      volumeUuid: ipod.volumeUuid,
      size: ipod.size,
      isMounted: ipod.isMounted,
      mountPoint: ipod.mountPoint,
    };

    // Determine if this should be the default device
    const deviceCount = Object.keys(existingDevices).length;
    const isFirstDevice = deviceCount === 0;

    // JSON mode: output without confirmation
    if (globalOpts.json) {
      const configPath = configResult.configPath ?? DEFAULT_CONFIG_PATH;
      const deviceConfig: DeviceConfig = {
        volumeUuid: ipod.volumeUuid,
        volumeName: ipod.volumeName,
      };

      const result = addDevice(name, deviceConfig, { configPath });

      // Set as default if first device
      if (result.success && isFirstDevice) {
        setDefaultDevice(name, { configPath });
      }

      outputJson({
        success: result.success,
        device: deviceInfo,
        saved: result.success,
        configPath: result.configPath,
        isDefault: isFirstDevice,
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

    // Ask for confirmation
    const shouldSave = await confirm(`Add this iPod as "${name}"? [Y/n] `);

    if (!shouldSave) {
      console.log('Cancelled. No changes made.');
      return;
    }

    // Save to config
    const configPath = configResult.configPath ?? DEFAULT_CONFIG_PATH;
    const deviceConfig: DeviceConfig = {
      volumeUuid: ipod.volumeUuid,
      volumeName: ipod.volumeName,
    };

    const result = addDevice(name, deviceConfig, { configPath });

    if (!result.success) {
      console.error(`Failed to save config: ${result.error}`);
      process.exitCode = 1;
      return;
    }

    // Set as default if first device
    if (isFirstDevice) {
      setDefaultDevice(name, { configPath });
    }

    console.log('');
    if (result.created) {
      console.log(`Created config file: ${result.configPath}`);
    } else {
      console.log(`Updated config file: ${result.configPath}`);
    }
    console.log('');
    console.log(`Device "${name}" added to config.`);
    if (isFirstDevice) {
      console.log(`Set as default device.`);
    }
    console.log('');
    console.log('You can now use:');
    console.log(`  podkit sync -d ${name}     # Sync to this device`);
    console.log('  podkit device show ' + name + '  # View device settings');
  });

// ============================================================================
// Remove subcommand
// ============================================================================

const removeSubcommand = new Command('remove')
  .description('remove a device from config')
  .argument('<name>', 'name of the device to remove')
  .option('--confirm', 'skip confirmation prompt')
  .action(async (name: string, options: { confirm?: boolean }) => {
    const { config, globalOpts, configResult } = getContext();

    const outputJson = (data: DeviceRemoveOutput) => {
      console.log(JSON.stringify(data, null, 2));
    };

    const devices = config.devices || {};
    const defaultDevice = config.defaults?.device;

    // Check if device exists
    if (!(name in devices)) {
      const error = `Device "${name}" not found in config.`;
      if (globalOpts.json) {
        outputJson({ success: false, error });
      } else {
        console.error(error);
        const available = Object.keys(devices);
        if (available.length > 0) {
          console.error(`Available devices: ${available.join(', ')}`);
        }
      }
      process.exitCode = 1;
      return;
    }

    const wasDefault = name === defaultDevice;

    // Confirmation required (unless --confirm flag or JSON mode)
    if (!options.confirm && !globalOpts.json) {
      console.log(`This will remove device "${name}" from the config.`);
      if (wasDefault) {
        console.log('This device is currently set as the default.');
      }
      console.log('');

      const confirmed = await confirmNo(`Remove device "${name}"? [y/N] `);
      if (!confirmed) {
        console.log('Cancelled. No changes made.');
        return;
      }
    }

    // Remove the device
    const configPath = configResult.configPath ?? DEFAULT_CONFIG_PATH;
    const result = removeDevice(name, { configPath });

    if (!result.success) {
      if (globalOpts.json) {
        outputJson({ success: false, error: result.error });
      } else {
        console.error(`Failed to remove device: ${result.error}`);
      }
      process.exitCode = 1;
      return;
    }

    // Clear default if this was the default device
    if (wasDefault) {
      setDefaultDevice('', { configPath }); // Empty string clears the default
    }

    if (globalOpts.json) {
      outputJson({
        success: true,
        device: name,
        wasDefault,
      });
    } else {
      console.log(`Device "${name}" removed from config.`);
      if (wasDefault) {
        console.log('Cleared default device setting.');
      }
    }
  });

// ============================================================================
// Show subcommand
// ============================================================================

const showSubcommand = new Command('show')
  .description('display device configuration details')
  .argument('<name>', 'name of the device to show')
  .action(async (name: string) => {
    const { config, globalOpts } = getContext();

    const outputJson = (data: DeviceShowOutput) => {
      console.log(JSON.stringify(data, null, 2));
    };

    const devices = config.devices || {};
    const defaultDevice = config.defaults?.device;

    // Check if device exists
    if (!(name in devices)) {
      const error = `Device "${name}" not found in config.`;
      if (globalOpts.json) {
        outputJson({ success: false, error });
      } else {
        console.error(error);
        const available = Object.keys(devices);
        if (available.length > 0) {
          console.error(`Available devices: ${available.join(', ')}`);
        }
      }
      process.exitCode = 1;
      return;
    }

    const device = devices[name]!;
    const isDefault = name === defaultDevice;

    if (globalOpts.json) {
      outputJson({
        success: true,
        device: {
          name,
          volumeUuid: device.volumeUuid,
          volumeName: device.volumeName,
          quality: device.quality,
          videoQuality: device.videoQuality,
          artwork: device.artwork,
          transforms: device.transforms as unknown as Record<string, unknown> | undefined,
          isDefault,
        },
      });
      return;
    }

    // Human-readable output
    console.log(`Device: ${name}${isDefault ? ' (default)' : ''}`);
    console.log('');
    console.log(`  Volume UUID:    ${device.volumeUuid}`);
    console.log(`  Volume Name:    ${device.volumeName}`);
    console.log(`  Quality:        ${device.quality || '(not set)'}`);
    console.log(`  Video Quality:  ${device.videoQuality || '(not set)'}`);
    console.log(
      `  Artwork:        ${device.artwork === true ? 'yes' : device.artwork === false ? 'no' : '(not set)'}`
    );

    // Show transforms if configured
    if (device.transforms) {
      console.log('');
      console.log('  Transforms:');
      for (const [transformName, transformConfig] of Object.entries(device.transforms)) {
        const config = transformConfig as Record<string, unknown>;
        const enabled = config.enabled !== false;
        const details: string[] = [];

        if ('format' in config && config.format) {
          details.push(`format: "${config.format}"`);
        }
        if ('drop' in config && config.drop === true) {
          details.push('drop');
        }

        const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
        console.log(`    ${transformName}:    ${enabled ? 'enabled' : 'disabled'}${detailStr}`);
      }
    }
  });

// ============================================================================
// Main device command
// ============================================================================

export const deviceCommand = new Command('device')
  .description('manage iPod devices in the config')
  .addCommand(listSubcommand)
  .addCommand(addSubcommand)
  .addCommand(removeSubcommand)
  .addCommand(showSubcommand)
  .action(async () => {
    // Default action: run list subcommand
    await listSubcommand.parseAsync([], { from: 'user' });
  });
