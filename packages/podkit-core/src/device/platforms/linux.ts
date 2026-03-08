/**
 * Linux device manager stub
 *
 * Device management on Linux is not yet implemented.
 * Returns unsupported error with manual instructions.
 */

import type { DeviceManager } from '../types.js';
import { UnsupportedDeviceManager } from './unsupported.js';

/**
 * Create a Linux device manager
 *
 * Returns an unsupported manager with Linux-specific instructions.
 * Future implementation could use udisks2 for device management.
 */
export function createLinuxManager(): DeviceManager {
  return new UnsupportedDeviceManager('linux');
}
