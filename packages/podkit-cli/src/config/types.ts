/**
 * Configuration types for podkit CLI
 */

/**
 * Quality presets for transcoding
 */
export type QualityPreset = 'high' | 'medium' | 'low';

/**
 * Configuration that can be set via config file, env vars, or CLI
 */
export interface PodkitConfig {
  /** Source directory for music collection */
  source?: string;
  /** iPod device mount point */
  device?: string;
  /** Transcoding quality preset */
  quality: QualityPreset;
  /** Include artwork in sync */
  artwork: boolean;
}

/**
 * Global CLI options (parsed from commander)
 */
export interface GlobalOptions {
  /** Verbosity level (0-3) */
  verbose: number;
  /** Suppress output */
  quiet: boolean;
  /** Output in JSON format */
  json: boolean;
  /** Disable colored output */
  color: boolean;
  /** Custom config file path */
  config?: string;
  /** iPod device path (CLI override) */
  device?: string;
}

/**
 * Partial config for merging (all fields optional)
 */
export type PartialConfig = Partial<PodkitConfig>;

/**
 * Config file content as parsed from TOML
 */
export interface ConfigFileContent {
  source?: string;
  device?: string;
  quality?: string;
  artwork?: boolean;
}
