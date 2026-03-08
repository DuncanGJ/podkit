/**
 * Device path resolution
 *
 * Centralizes the logic for finding the iPod mount point.
 * Priority order:
 *   1. CLI --device flag (explicit override)
 *   2. Auto-detect via Volume UUID (if registered)
 *   3. Legacy config.device fallback
 */

import type { PodkitConfig } from './config/index.js';
import type { DeviceManager, DeviceInfo } from '@podkit/core';

/**
 * Result of device resolution
 */
export interface ResolveDeviceResult {
  /** Resolved device path, if found */
  path?: string;
  /** How the device was found */
  source: 'cli' | 'uuid' | 'config' | 'none';
  /** Device info if found via UUID */
  deviceInfo?: DeviceInfo;
  /** Error message if resolution failed */
  error?: string;
}

/**
 * Options for device resolution
 */
export interface ResolveDeviceOptions {
  /** CLI --device flag value */
  cliDevice?: string;
  /** Loaded config */
  config: PodkitConfig;
  /** Device manager instance */
  manager: DeviceManager;
  /** Whether to require the device to be mounted */
  requireMounted?: boolean;
  /** Suppress console output */
  quiet?: boolean;
}

/**
 * Resolve the iPod device path
 *
 * Implements Option C priority:
 * 1. CLI --device flag (always wins)
 * 2. Auto-detect via Volume UUID from [ipod] config
 * 3. Legacy config.device fallback (for unregistered iPods)
 */
export async function resolveDevicePath(
  options: ResolveDeviceOptions
): Promise<ResolveDeviceResult> {
  const { cliDevice, config, manager, requireMounted = true, quiet = false } = options;

  // 1. CLI --device flag takes precedence
  if (cliDevice) {
    return {
      path: cliDevice,
      source: 'cli',
    };
  }

  // 2. Try auto-detect via Volume UUID
  if (config.ipod?.volumeUuid) {
    if (!quiet) {
      // This will be logged by the caller if needed
    }

    const device = await manager.findByVolumeUuid(config.ipod.volumeUuid);

    if (device) {
      if (requireMounted) {
        if (device.isMounted && device.mountPoint) {
          return {
            path: device.mountPoint,
            source: 'uuid',
            deviceInfo: device,
          };
        } else {
          return {
            source: 'uuid',
            deviceInfo: device,
            error: 'iPod found but not mounted',
          };
        }
      } else {
        // For mount command - return device info even if not mounted
        return {
          path: device.mountPoint,
          source: 'uuid',
          deviceInfo: device,
        };
      }
    }

    // UUID configured but device not found
    return {
      source: 'none',
      error: `iPod with UUID ${config.ipod.volumeUuid} not found. Is it connected?`,
    };
  }

  // 3. Legacy fallback to config.device
  if (config.device) {
    return {
      path: config.device,
      source: 'config',
    };
  }

  // No device configured
  return {
    source: 'none',
    error: 'No iPod configured. Run: podkit add-device',
  };
}

/**
 * Format a helpful error message for device resolution failures
 */
export function formatDeviceError(result: ResolveDeviceResult): string {
  if (result.error) {
    return result.error;
  }

  switch (result.source) {
    case 'uuid':
      if (result.deviceInfo && !result.deviceInfo.isMounted) {
        return 'iPod found but not mounted. Run: sudo podkit mount';
      }
      return 'iPod not found';
    case 'none':
      return 'No iPod configured. Run: podkit add-device';
    default:
      return 'Device not found';
  }
}
