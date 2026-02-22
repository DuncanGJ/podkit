/**
 * Transcoding types and presets
 *
 * FFmpeg-based transcoding for converting audio files
 * to iPod-compatible formats (AAC/M4A).
 */

/**
 * Transcode quality preset
 */
export interface TranscodePreset {
  name: 'high' | 'medium' | 'low' | 'custom';
  codec: 'aac';
  container: 'm4a';
  /** CBR bitrate in kbps (mutually exclusive with quality) */
  bitrate?: number;
  /** VBR quality level (mutually exclusive with bitrate) */
  quality?: number;
  /** Output sample rate in Hz */
  sampleRate?: number;
  /** Number of audio channels */
  channels?: number;
  /** Additional FFmpeg arguments */
  customArgs?: string[];
}

/**
 * Built-in quality presets
 */
export const PRESETS: Record<'high' | 'medium' | 'low', TranscodePreset> = {
  high: {
    name: 'high',
    codec: 'aac',
    container: 'm4a',
    bitrate: 256,
    sampleRate: 44100,
  },
  medium: {
    name: 'medium',
    codec: 'aac',
    container: 'm4a',
    bitrate: 192,
    sampleRate: 44100,
  },
  low: {
    name: 'low',
    codec: 'aac',
    container: 'm4a',
    bitrate: 128,
    sampleRate: 44100,
  },
} as const;

/**
 * Capabilities detected from FFmpeg installation
 */
export interface TranscoderCapabilities {
  /** FFmpeg version string */
  version: string;
  /** Path to FFmpeg binary */
  path: string;
  /** Available AAC encoders (e.g., 'aac', 'libfdk_aac') */
  aacEncoders: string[];
  /** Preferred AAC encoder */
  preferredEncoder: string;
}

/**
 * Result of a transcode operation
 */
export interface TranscodeResult {
  /** Path to output file */
  outputPath: string;
  /** Output file size in bytes */
  size: number;
  /** Transcode duration in milliseconds */
  duration: number;
  /** Output bitrate in kbps */
  bitrate: number;
}

/**
 * Audio file metadata from probing
 */
export interface AudioMetadata {
  /** Duration in milliseconds */
  duration: number;
  /** Bitrate in kbps */
  bitrate: number;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Codec name */
  codec: string;
  /** Container format */
  format: string;
}

/**
 * Transcoder interface for audio conversion
 */
export interface Transcoder {
  /**
   * Detect FFmpeg installation and capabilities
   */
  detect(): Promise<TranscoderCapabilities>;

  /**
   * Transcode an audio file to iPod-compatible format
   */
  transcode(
    input: string,
    output: string,
    preset: TranscodePreset
  ): Promise<TranscodeResult>;

  /**
   * Probe an audio file for metadata
   */
  probe(file: string): Promise<AudioMetadata>;
}

/**
 * Progress callback for transcode operations
 */
export interface TranscodeProgress {
  /** Current position in seconds */
  time: number;
  /** Total duration in seconds */
  duration: number;
  /** Percentage complete (0-100) */
  percent: number;
}

/**
 * Options for transcode operations
 */
export interface TranscodeOptions {
  /** Override FFmpeg binary path */
  ffmpegPath?: string;
  /** Progress callback */
  onProgress?: (progress: TranscodeProgress) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}
