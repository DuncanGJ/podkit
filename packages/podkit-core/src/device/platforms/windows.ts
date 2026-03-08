/**
 * Windows device manager stub
 *
 * Device management on Windows is not yet implemented.
 * Returns unsupported error with manual instructions.
 */

import type { DeviceManager } from '../types.js';
import { UnsupportedDeviceManager } from './unsupported.js';

/**
 * Create a Windows device manager
 *
 * Returns an unsupported manager with Windows-specific instructions.
 * Future implementation could use WMI or diskpart for device management.
 */
export function createWindowsManager(): DeviceManager {
  return new UnsupportedDeviceManager('win32');
}
