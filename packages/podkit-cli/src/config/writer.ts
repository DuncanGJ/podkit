/**
 * Configuration file writer
 *
 * Provides utilities to update the config file with new sections
 * while preserving existing content.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IpodIdentity } from './types.js';
import { DEFAULT_CONFIG_PATH } from './defaults.js';

/**
 * Options for updating config file
 */
export interface UpdateConfigOptions {
  /** Path to config file (defaults to DEFAULT_CONFIG_PATH) */
  configPath?: string;
  /** Create file if it doesn't exist */
  createIfMissing?: boolean;
}

/**
 * Result of config update operation
 */
export interface UpdateConfigResult {
  /** Whether the update succeeded */
  success: boolean;
  /** Path to the config file */
  configPath: string;
  /** Whether the file was created */
  created: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Update or add iPod identity to config file
 *
 * Appends or updates the [ipod] section in the config file.
 * Creates the file and parent directories if needed.
 */
export function updateIpodIdentity(
  identity: IpodIdentity,
  options?: UpdateConfigOptions
): UpdateConfigResult {
  const configPath = options?.configPath ?? DEFAULT_CONFIG_PATH;
  const createIfMissing = options?.createIfMissing ?? true;

  let content = '';
  let created = false;

  // Read existing config if it exists
  if (fs.existsSync(configPath)) {
    content = fs.readFileSync(configPath, 'utf-8');
  } else if (createIfMissing) {
    created = true;
    // Create parent directory if needed
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } else {
    return {
      success: false,
      configPath,
      created: false,
      error: `Config file not found: ${configPath}`,
    };
  }

  // Generate the [ipod] section
  const ipodSection = `
[ipod]
volumeUuid = "${identity.volumeUuid}"
volumeName = "${identity.volumeName}"
`;

  // Check if [ipod] section already exists
  const ipodSectionRegex = /\[ipod\][\s\S]*?(?=\n\[|\n*$)/;
  if (ipodSectionRegex.test(content)) {
    // Replace existing [ipod] section
    content = content.replace(ipodSectionRegex, ipodSection.trim());
  } else {
    // Append [ipod] section
    // Ensure there's a newline before the new section
    if (content.length > 0 && !content.endsWith('\n')) {
      content += '\n';
    }
    content += ipodSection;
  }

  // Write updated config
  try {
    fs.writeFileSync(configPath, content);
    return {
      success: true,
      configPath,
      created,
    };
  } catch (err) {
    return {
      success: false,
      configPath,
      created: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Remove the legacy 'device' field from config file
 *
 * Called when registering an iPod to clean up the old config style.
 * The [ipod] section with volumeUuid takes over device detection.
 */
export function removeDeviceField(options?: UpdateConfigOptions): UpdateConfigResult {
  const configPath = options?.configPath ?? DEFAULT_CONFIG_PATH;

  if (!fs.existsSync(configPath)) {
    return {
      success: true,
      configPath,
      created: false,
    };
  }

  let content = fs.readFileSync(configPath, 'utf-8');

  // Remove device = "..." line (handles both quoted and unquoted values)
  // Also removes the comment line above it if present
  const deviceLineRegex = /^#[^\n]*device[^\n]*\n?^device\s*=\s*["']?[^"'\n]+["']?\s*\n?/gm;
  content = content.replace(deviceLineRegex, '');

  // Also try just the device line without comment
  const simpleDeviceRegex = /^device\s*=\s*["']?[^"'\n]+["']?\s*\n?/gm;
  content = content.replace(simpleDeviceRegex, '');

  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  try {
    fs.writeFileSync(configPath, content);
    return {
      success: true,
      configPath,
      created: false,
    };
  } catch (err) {
    return {
      success: false,
      configPath,
      created: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Remove iPod identity from config file
 *
 * Removes the [ipod] section from the config file if present.
 */
export function removeIpodIdentity(options?: UpdateConfigOptions): UpdateConfigResult {
  const configPath = options?.configPath ?? DEFAULT_CONFIG_PATH;

  if (!fs.existsSync(configPath)) {
    return {
      success: true, // Nothing to remove
      configPath,
      created: false,
    };
  }

  let content = fs.readFileSync(configPath, 'utf-8');

  // Remove [ipod] section
  const ipodSectionRegex = /\n?\[ipod\][\s\S]*?(?=\n\[|\n*$)/;
  content = content.replace(ipodSectionRegex, '');

  // Clean up trailing whitespace
  content = content.trimEnd() + '\n';

  try {
    fs.writeFileSync(configPath, content);
    return {
      success: true,
      configPath,
      created: false,
    };
  } catch (err) {
    return {
      success: false,
      configPath,
      created: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
