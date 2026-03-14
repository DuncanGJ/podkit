/**
 * Native binding loader for libgpod.
 *
 * This module handles loading the native N-API addon and provides
 * typed interfaces for the raw native functions.
 */

import { createRequire } from 'module';
import { dirname, join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { arch as osArch, platform as osPlatform } from 'os';

import type {
  Track,
  Playlist,
  DeviceInfo,
  TrackInput,
  ArtworkCapabilities,
  DeviceCapabilities,
  SmartPlaylist,
  SPLRule,
  SPLPreferences,
  SPLMatch,
  Chapter,
  ChapterInput,
  Photo,
  PhotoAlbum,
  PhotoDatabaseInfo,
} from './types';

/**
 * Database info returned by native binding.
 */
export interface NativeDatabaseInfo {
  mountpoint: string | null;
  version: number;
  id: bigint;
  trackCount: number;
  playlistCount: number;
  device: DeviceInfo | null;
}

/**
 * Native Database class interface.
 *
 * This interface reflects the native API which uses handle indices (numbers)
 * to reference tracks. The TypeScript Database class wraps these in TrackHandle
 * objects for type safety.
 */
export interface NativeDatabase {
  getInfo(): NativeDatabaseInfo;

  // Track operations - handle-based API
  /** Get all track handles (indices into native track array) */
  getTracks(): number[];
  /** Add a track, returns handle index */
  addTrack(input: TrackInput): number;
  /** Get track data from handle */
  getTrackData(handle: number): Track;
  /** Remove a track by handle */
  removeTrack(handle: number): void;
  /** Copy track file to device */
  copyTrackToDevice(handle: number, sourcePath: string): Track;
  /** Replace an existing track's file on the iPod */
  replaceTrackFile(handle: number, newFilePath: string): Track;
  /** Set track thumbnails from file */
  setTrackThumbnails(handle: number, imagePath: string): Track;
  /** Set track thumbnails from buffer */
  setTrackThumbnailsFromData(handle: number, imageData: Buffer): Track;
  /** Remove track thumbnails */
  removeTrackThumbnails(handle: number): Track;
  /** Check if track has thumbnails */
  hasTrackThumbnails(handle: number): boolean;
  /** Update track metadata */
  updateTrack(handle: number, fields: Partial<TrackInput>): Track;
  /** Get track file path on iPod */
  getTrackFilePath(handle: number): string | null;
  /** Duplicate a track, returns new handle */
  duplicateTrack(handle: number): number;
  /** Get unique artwork IDs */
  getUniqueArtworkIds(): number[];
  /** Get artwork format capabilities */
  getArtworkFormats(): ArtworkCapabilities;

  // Track lookup by dbid (returns handle or -1)
  getTrackByDbId(dbid: bigint): number;

  // Database operations
  getPlaylists(): Playlist[];
  write(): boolean;
  close(): void;
  getMountpoint(): string | null;
  setMountpoint(mountpoint: string): void;
  getFilename(): string | null;

  // Playlist operations
  createPlaylist(name: string): Playlist;
  removePlaylist(playlistId: bigint): void;
  getPlaylistById(playlistId: bigint): Playlist | null;
  getPlaylistByName(name: string): Playlist | null;
  setPlaylistName(playlistId: bigint, newName: string): Playlist;
  /** Add track to playlist by handle */
  addTrackToPlaylist(playlistId: bigint, handle: number): Playlist;
  /** Remove track from playlist by handle */
  removeTrackFromPlaylist(playlistId: bigint, handle: number): Playlist;
  /** Check if playlist contains track by handle */
  playlistContainsTrack(playlistId: bigint, handle: number): boolean;
  /** Get playlist tracks as handles */
  getPlaylistTracks(playlistId: bigint): number[];

  // Smart playlist operations
  createSmartPlaylist(
    name: string,
    config?: {
      match?: SPLMatch;
      rules?: SPLRule[];
      preferences?: SPLPreferences;
    }
  ): SmartPlaylist;
  getSmartPlaylistRules(playlistId: bigint): SPLRule[];
  addSmartPlaylistRule(playlistId: bigint, rule: SPLRule): SmartPlaylist;
  removeSmartPlaylistRule(playlistId: bigint, ruleIndex: number): SmartPlaylist;
  clearSmartPlaylistRules(playlistId: bigint): SmartPlaylist;
  setSmartPlaylistPreferences(
    playlistId: bigint,
    preferences: Partial<SPLPreferences>
  ): SmartPlaylist;
  getSmartPlaylistPreferences(playlistId: bigint): SPLPreferences;
  /** Evaluate smart playlist, returns handles */
  evaluateSmartPlaylist(playlistId: bigint): number[];

  // Device capability operations
  getDeviceCapabilities(): DeviceCapabilities;
  getSysInfo(field: string): string | null;
  setSysInfo(field: string, value: string | null): void;

  // Chapter data operations - handle-based
  getTrackChapters(handle: number): Chapter[];
  setTrackChapters(handle: number, chapters: ChapterInput[]): Chapter[];
  addTrackChapter(handle: number, startPos: number, title: string): Chapter[];
  clearTrackChapters(handle: number): void;
}

/**
 * Version info returned by native binding.
 */
export interface NativeVersion {
  major: number;
  minor: number;
  patch: number;
  string: string;
}

/**
 * Native PhotoDatabase class interface.
 */
export interface NativePhotoDatabase {
  getInfo(): PhotoDatabaseInfo;
  getPhotos(): Photo[];
  getPhotoAlbums(): PhotoAlbum[];
  addPhoto(imagePath: string, position?: number, rotation?: number): Photo;
  addPhotoFromData(imageData: Buffer, position?: number, rotation?: number): Photo;
  removePhoto(photoId: number): void;
  getPhotoById(photoId: number): Photo | null;
  createPhotoAlbum(name: string, position?: number): PhotoAlbum;
  removePhotoAlbum(albumId: number, removePhotos?: boolean): void;
  getPhotoAlbumByName(name: string | null): PhotoAlbum | null;
  addPhotoToAlbum(albumId: number, photoId: number, position?: number): PhotoAlbum;
  removePhotoFromAlbum(albumId: number, photoId: number): PhotoAlbum;
  getPhotoAlbumPhotos(albumId: number): Photo[];
  setPhotoAlbumName(albumId: number, newName: string): PhotoAlbum;
  write(): boolean;
  close(): void;
  getMountpoint(): string | null;
  setMountpoint(mountpoint: string): void;
  getDeviceCapabilities(): DeviceCapabilities;
  setSysInfo(field: string, value: string | null): void;
}

/**
 * Native binding module interface.
 */
export interface NativeBinding {
  Database: new () => NativeDatabase;
  parse(mountpoint: string): NativeDatabase;
  parseFile(filename: string): NativeDatabase;
  create(): NativeDatabase;
  initIpod(mountpoint: string, model?: string, name?: string): NativeDatabase;
  getVersion(): NativeVersion;

  // Photo database
  PhotoDatabase: new () => NativePhotoDatabase;
  parsePhotoDb(mountpoint: string): NativePhotoDatabase;
  createPhotoDb(mountpoint?: string): NativePhotoDatabase;
}

// Cached binding reference
let cachedBinding: NativeBinding | null = null;
let loadError: Error | null = null;

const BINDING_FILENAME = 'gpod_binding.node';

/**
 * Get candidate directories for finding the native addon.
 *
 * This code may be bundled into another package (e.g., podkit-core/dist/),
 * so we try multiple resolution strategies.
 */
function getPackageRootCandidates(): string[] {
  const candidates: string[] = [];

  // 1. Try require.resolve — works when installed as a dependency
  try {
    const require = createRequire(import.meta.url);
    const pkgJson = require.resolve('@podkit/libgpod-node/package.json');
    candidates.push(dirname(pkgJson));
  } catch {
    // Not resolvable as a package (e.g., running from source)
  }

  // 2. Relative to this source file (development: src/ or dist/)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  candidates.push(dirname(__dirname));

  // 3. Walk up from this file looking for node_modules
  let searchDir = __dirname;
  const visited = new Set<string>();
  while (searchDir && !visited.has(searchDir)) {
    visited.add(searchDir);
    const candidate = join(searchDir, 'node_modules', '@podkit', 'libgpod-node');
    if (existsSync(candidate)) {
      candidates.push(candidate);
    }
    const parent = dirname(searchDir);
    if (parent === searchDir) break;
    searchDir = parent;
  }

  return candidates;
}

/**
 * Find a prebuild binary in a package root's prebuilds/ directory.
 *
 * Implements the prebuildify convention:
 *   prebuilds/{platform}-{arch}/*.napi.node
 *
 * This is inlined rather than using node-gyp-build so it works when
 * the code is bundled into another package (e.g., the CLI dist).
 */
function findPrebuild(packageRoot: string): string | null {
  const platform = osPlatform();
  const arch = osArch();
  const prebuildsDir = join(packageRoot, 'prebuilds');

  let entries: string[];
  try {
    entries = readdirSync(prebuildsDir);
  } catch {
    return null;
  }

  // Find matching platform-arch directory (e.g., "darwin-arm64")
  const matchingDir = entries.find((entry) => {
    const parts = entry.split('-');
    if (parts.length !== 2) return false;
    return parts[0] === platform && parts[1]!.split('+').includes(arch);
  });

  if (!matchingDir) return null;

  // Find a .node file, preferring napi builds
  let nodeFiles: string[];
  try {
    nodeFiles = readdirSync(join(prebuildsDir, matchingDir)).filter((f) => f.endsWith('.node'));
  } catch {
    return null;
  }

  const napiFile = nodeFiles.find((f) => f.includes('.napi.') || f.includes('napi'));
  const file = napiFile || nodeFiles[0];
  return file ? join(prebuildsDir, matchingDir, file) : null;
}

/**
 * Find the native addon by checking prebuilds/ then build/Release/.
 */
function findAddon(): string | null {
  const candidates = getPackageRootCandidates();

  for (const root of candidates) {
    // 1. Check prebuilds/ (shipped binaries)
    const prebuild = findPrebuild(root);
    if (prebuild) return prebuild;

    // 2. Check build/Release/ (local node-gyp build)
    const buildPath = join(root, 'build', 'Release', BINDING_FILENAME);
    if (existsSync(buildPath)) return buildPath;
  }

  return null;
}

/**
 * Load the native binding.
 *
 * Resolution order:
 * 1. prebuilds/{platform}-{arch}/ (prebuildify convention)
 * 2. build/Release/ (local node-gyp build)
 *
 * @throws Error if the native binding cannot be loaded
 */
function loadBinding(): NativeBinding {
  if (cachedBinding) {
    return cachedBinding;
  }

  if (loadError) {
    throw loadError;
  }

  try {
    const require = createRequire(import.meta.url);
    const addonPath = findAddon();

    if (!addonPath) {
      const candidates = getPackageRootCandidates();
      throw new Error(
        'Native binding not found. Searched package roots:\n' +
          candidates.map((p) => `  - ${p}`).join('\n')
      );
    }

    cachedBinding = require(addonPath) as NativeBinding;
    return cachedBinding;
  } catch (error) {
    loadError = new Error(
      `Failed to load native binding: ${error instanceof Error ? error.message : String(error)}\n` +
        'Make sure you have run `bun run build:native` to compile the native module,\n' +
        'or install a version with prebuilt binaries for your platform.'
    );
    throw loadError;
  }
}

/**
 * Check if the native binding is available.
 */
export function isNativeAvailable(): boolean {
  try {
    loadBinding();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the native binding module.
 *
 * @throws Error if the binding is not available
 */
export function getNativeBinding(): NativeBinding {
  return loadBinding();
}

/**
 * Parse an iPod database from a mountpoint.
 *
 * @param mountpoint Path to the iPod mount point
 * @returns Native database handle
 * @throws Error if parsing fails
 */
export function parse(mountpoint: string): NativeDatabase {
  const binding = loadBinding();
  return binding.parse(mountpoint);
}

/**
 * Parse an iPod database from a specific file path.
 *
 * Unlike parse(), this reads a database file directly without requiring
 * a full iPod mount point structure. The database will have no mountpoint
 * set, and track file operations may not work correctly.
 *
 * @param filename Path to the iTunesDB file
 * @returns Native database handle
 * @throws Error if parsing fails
 */
export function parseFile(filename: string): NativeDatabase {
  const binding = loadBinding();
  return binding.parseFile(filename);
}

/**
 * Create a new empty iPod database.
 *
 * Creates a fresh database that is not associated with any mountpoint.
 * The database has reasonable defaults (version 0x13, random ID).
 * Use setMountpoint() to associate with an iPod before writing.
 *
 * @returns Native database handle
 * @throws Error if creation fails
 */
export function create(): NativeDatabase {
  const binding = loadBinding();
  return binding.create();
}

/**
 * Initialize a new iPod database on a mountpoint.
 *
 * Creates the iPod_Control directory structure, SysInfo file,
 * and an empty iTunesDB ready for use. This is what you use to
 * set up an iPod that has no existing database (e.g., after reformatting).
 *
 * @param mountpoint Path to the iPod mount point (directory will be created if needed)
 * @param model Optional model number (e.g., "MA147" for iPod Video 60GB)
 * @param name Optional iPod name (default: "iPod")
 * @returns Native database handle
 * @throws Error if initialization fails
 */
export function initIpod(mountpoint: string, model?: string, name?: string): NativeDatabase {
  const binding = loadBinding();
  return binding.initIpod(mountpoint, model, name);
}

/**
 * Get libgpod version information.
 */
export function getVersion(): NativeVersion {
  const binding = loadBinding();
  return binding.getVersion();
}

/**
 * Parse an iPod photo database from a mountpoint.
 *
 * @param mountpoint Path to the iPod mount point
 * @returns Native photo database handle
 * @throws Error if parsing fails
 */
export function parsePhotoDb(mountpoint: string): NativePhotoDatabase {
  const binding = loadBinding();
  return binding.parsePhotoDb(mountpoint);
}

/**
 * Create a new empty iPod photo database.
 *
 * Creates a fresh photo database. If mountpoint is provided, the database
 * is associated with that iPod. Otherwise, use setMountpoint() later.
 *
 * @param mountpoint Optional path to the iPod mount point
 * @returns Native photo database handle
 * @throws Error if creation fails
 */
export function createPhotoDb(mountpoint?: string): NativePhotoDatabase {
  const binding = loadBinding();
  return binding.createPhotoDb(mountpoint);
}
