/**
 * Device path resolution
 *
 * This module centralizes the logic for finding the iPod mount point.
 * Priority order:
 *   1. CLI --device flag (path or named device)
 *   2. Named device from positional arg or -d flag
 *   3. Default device from config.defaults.device
 *   4. Auto-detect via Volume UUID (from resolved device config)
 *
 * @see ./resolvers/device.ts for the core implementation
 */

import type { DeviceManager } from '@podkit/core';
import type { PodkitConfig } from './config/index.js';
import {
  getDeviceIdentity as getDeviceIdentityCore,
  resolveDevicePath as resolveDevicePathCore,
  formatDevicePathError,
  formatDeviceLookupMessage as formatDeviceLookupMessageCore,
  type DevicePathResult,
  type DevicePathOptions,
  type ResolvedDevice,
  type DeviceIdentity,
} from './resolvers/index.js';

// =============================================================================
// Re-exports from resolvers module
// =============================================================================

export type { ResolvedDevice, DeviceIdentity, MatchedDevice } from './resolvers/index.js';
export { parseCliDeviceArg, resolveEffectiveDevice, autoDetectDevice } from './resolvers/index.js';

// =============================================================================
// Convenience wrappers
// =============================================================================

/**
 * Get device identity for device path resolution
 */
export function getDeviceIdentity(
  resolvedDevice: ResolvedDevice | undefined
): DeviceIdentity | undefined {
  return getDeviceIdentityCore(resolvedDevice);
}

/**
 * Resolve the iPod device path
 *
 * @param options - Resolution options (cliDevice maps to cliPath)
 */
export async function resolveDevicePath(options: {
  cliDevice?: string;
  deviceIdentity?: DeviceIdentity;
  manager: DeviceManager;
  requireMounted?: boolean;
  quiet?: boolean;
  config?: PodkitConfig;
}): Promise<DevicePathResult> {
  const newOptions: DevicePathOptions = {
    cliPath: options.cliDevice,
    deviceIdentity: options.deviceIdentity,
    manager: options.manager,
    requireMounted: options.requireMounted,
    config: options.config,
  };
  return resolveDevicePathCore(newOptions);
}

/**
 * Format a helpful error message for device resolution failures
 */
export function formatDeviceError(result: DevicePathResult): string {
  return formatDevicePathError(result);
}

/**
 * Format a message for device lookup
 */
export function formatDeviceLookupMessage(
  deviceName: string | undefined,
  deviceIdentity: DeviceIdentity | undefined,
  verbose: boolean
): string {
  return formatDeviceLookupMessageCore(deviceName, deviceIdentity, verbose);
}
