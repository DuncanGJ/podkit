/**
 * High-level TypeScript wrapper for iPod database operations.
 *
 * This module provides a clean async API around the native bindings,
 * with proper TypeScript types and error handling.
 */

import {
  parse as nativeParse,
  type NativeDatabase,
} from './binding';

import type {
  Track,
  Playlist,
  DatabaseInfo,
  TrackInput,
  DeviceInfo,
} from './types';

import { LibgpodError, LibgpodErrorCode } from './types';

/**
 * Represents an iPod database connection.
 *
 * Use `Database.open()` to parse an existing iPod database.
 *
 * @example
 * ```typescript
 * const db = await Database.open('/media/ipod');
 * console.log(`Found ${db.trackCount} tracks`);
 *
 * const tracks = db.getTracks();
 * for (const track of tracks) {
 *   console.log(`${track.artist} - ${track.title}`);
 * }
 *
 * db.close();
 * ```
 */
export class Database {
  private native: NativeDatabase | null;
  private _mountpoint: string;
  private _closed = false;

  private constructor(native: NativeDatabase, mountpoint: string) {
    this.native = native;
    this._mountpoint = mountpoint;
  }

  /**
   * Open an iPod database from a mount point.
   *
   * @param mountpoint Path to the iPod mount point (e.g., "/media/ipod")
   * @returns Database instance
   * @throws LibgpodError if the database cannot be parsed
   */
  static async open(mountpoint: string): Promise<Database> {
    try {
      const native = nativeParse(mountpoint);
      return new Database(native, mountpoint);
    } catch (error) {
      throw new LibgpodError(
        error instanceof Error ? error.message : String(error),
        LibgpodErrorCode.Corrupt,
        'parse'
      );
    }
  }

  /**
   * Synchronous version of open() for cases where async is not needed.
   *
   * @param mountpoint Path to the iPod mount point
   * @returns Database instance
   * @throws LibgpodError if the database cannot be parsed
   */
  static openSync(mountpoint: string): Database {
    try {
      const native = nativeParse(mountpoint);
      return new Database(native, mountpoint);
    } catch (error) {
      throw new LibgpodError(
        error instanceof Error ? error.message : String(error),
        LibgpodErrorCode.Corrupt,
        'parse'
      );
    }
  }

  /**
   * Ensure the database is open.
   */
  private ensureOpen(): NativeDatabase {
    if (this._closed || !this.native) {
      throw new LibgpodError(
        'Database is closed',
        LibgpodErrorCode.Unknown,
        'ensureOpen'
      );
    }
    return this.native;
  }

  /**
   * The iPod mount point path.
   */
  get mountpoint(): string {
    return this._mountpoint;
  }

  /**
   * Whether the database has been closed.
   */
  get closed(): boolean {
    return this._closed;
  }

  /**
   * Get database information.
   */
  getInfo(): DatabaseInfo {
    const native = this.ensureOpen();
    const info = native.getInfo();

    // Provide default device info if null
    const device: DeviceInfo = info.device ?? {
      modelNumber: null,
      modelName: 'Unknown',
      generation: 'unknown',
      model: 'unknown',
      capacity: 0,
      musicDirs: 0,
      supportsArtwork: false,
      supportsVideo: false,
      supportsPhoto: false,
      supportsPodcast: false,
    };

    return {
      mountpoint: info.mountpoint ?? this._mountpoint,
      version: info.version,
      id: info.id,
      trackCount: info.trackCount,
      playlistCount: info.playlistCount,
      device,
    };
  }

  /**
   * Number of tracks in the database.
   */
  get trackCount(): number {
    return this.getInfo().trackCount;
  }

  /**
   * Number of playlists in the database.
   */
  get playlistCount(): number {
    return this.getInfo().playlistCount;
  }

  /**
   * Device information.
   */
  get device(): DeviceInfo {
    return this.getInfo().device;
  }

  /**
   * Get all tracks in the database.
   *
   * @returns Array of track metadata
   */
  getTracks(): Track[] {
    const native = this.ensureOpen();
    return native.getTracks();
  }

  /**
   * Get a track by its ID.
   *
   * @param id Track ID
   * @returns Track or null if not found
   */
  getTrackById(id: number): Track | null {
    const native = this.ensureOpen();
    return native.getTrackById(id);
  }

  /**
   * Get all playlists in the database.
   *
   * @returns Array of playlist metadata
   */
  getPlaylists(): Playlist[] {
    const native = this.ensureOpen();
    return native.getPlaylists();
  }

  /**
   * Add a new track to the database.
   *
   * Note: This only adds metadata to the database. To copy a file to the iPod,
   * use `copyTrackToDevice()` after adding the track.
   *
   * @param input Track metadata
   * @returns The created track with assigned ID
   */
  addTrack(input: TrackInput): Track {
    const native = this.ensureOpen();
    return native.addTrack(input);
  }

  /**
   * Copy an audio file to the iPod storage.
   *
   * This copies the source file to the iPod's internal storage location
   * and updates the track's ipod_path. The track must already be added
   * to the database via `addTrack()` before calling this method.
   *
   * The file format must be iPod-compatible (MP3, AAC/M4A).
   * Transcoding should be done before calling this method.
   *
   * @param trackId ID of the track to copy file for
   * @param sourcePath Path to the source audio file
   * @returns The updated track with ipod_path set
   * @throws LibgpodError if copying fails (disk full, file not found, etc.)
   *
   * @example
   * ```typescript
   * const track = db.addTrack({ title: 'Song', artist: 'Artist' });
   * const updated = db.copyTrackToDevice(track.id, '/path/to/song.mp3');
   * console.log(updated.ipodPath); // :iPod_Control:Music:F00:...
   * await db.save();
   * ```
   */
  copyTrackToDevice(trackId: number, sourcePath: string): Track {
    const native = this.ensureOpen();
    try {
      return native.copyTrackToDevice(trackId, sourcePath);
    } catch (error) {
      throw new LibgpodError(
        error instanceof Error ? error.message : String(error),
        LibgpodErrorCode.Unknown,
        'copyTrackToDevice'
      );
    }
  }

  /**
   * Async version of copyTrackToDevice for consistency with other async methods.
   *
   * @param trackId ID of the track to copy file for
   * @param sourcePath Path to the source audio file
   * @returns The updated track with ipod_path set
   */
  async copyTrackToDeviceAsync(
    trackId: number,
    sourcePath: string
  ): Promise<Track> {
    return this.copyTrackToDevice(trackId, sourcePath);
  }

  /**
   * Remove a track from the database.
   *
   * Note: This does not delete the file from the iPod.
   *
   * @param trackId Track ID to remove
   */
  removeTrack(trackId: number): void {
    const native = this.ensureOpen();
    native.removeTrack(trackId);
  }

  /**
   * Set artwork for a track from an image file.
   *
   * Uses libgpod's `itdb_track_set_thumbnails` to set artwork.
   * libgpod automatically handles:
   * - Resizing to all required thumbnail sizes
   * - Converting to the correct pixel format for the device
   * - Writing to .ithmb files on save()
   *
   * The image file must exist until save() is called, as thumbnails
   * are generated lazily during the write operation.
   *
   * @param trackId ID of the track to set artwork for
   * @param imagePath Path to the image file (JPEG or PNG recommended)
   * @returns The updated track with hasArtwork set to true
   * @throws LibgpodError if setting artwork fails (track not found, invalid image, etc.)
   *
   * @example
   * ```typescript
   * // Extract artwork from source file and apply to iPod track
   * const artworkPath = await extractAndSaveArtwork('/path/to/song.flac');
   * if (artworkPath) {
   *   db.setTrackArtwork(track.id, artworkPath);
   * }
   * await db.save();
   * // Clean up temp artwork file after save
   * await cleanupTempArtwork(artworkPath);
   * ```
   */
  setTrackArtwork(trackId: number, imagePath: string): Track {
    const native = this.ensureOpen();
    try {
      return native.setTrackThumbnails(trackId, imagePath);
    } catch (error) {
      throw new LibgpodError(
        error instanceof Error ? error.message : String(error),
        LibgpodErrorCode.Unknown,
        'setTrackArtwork'
      );
    }
  }

  /**
   * Async version of setTrackArtwork for consistency with other async methods.
   *
   * @param trackId ID of the track to set artwork for
   * @param imagePath Path to the image file
   * @returns The updated track with hasArtwork set to true
   */
  async setTrackArtworkAsync(trackId: number, imagePath: string): Promise<Track> {
    return this.setTrackArtwork(trackId, imagePath);
  }

  /**
   * Write changes to the iPod database.
   *
   * Call this after making modifications (adding/removing tracks, etc.)
   * to persist changes to disk.
   *
   * @throws LibgpodError if writing fails
   */
  async save(): Promise<void> {
    const native = this.ensureOpen();
    try {
      native.write();
    } catch (error) {
      throw new LibgpodError(
        error instanceof Error ? error.message : String(error),
        LibgpodErrorCode.Unknown,
        'write'
      );
    }
  }

  /**
   * Synchronous version of save().
   *
   * @throws LibgpodError if writing fails
   */
  saveSync(): void {
    const native = this.ensureOpen();
    try {
      native.write();
    } catch (error) {
      throw new LibgpodError(
        error instanceof Error ? error.message : String(error),
        LibgpodErrorCode.Unknown,
        'write'
      );
    }
  }

  /**
   * Close the database and free resources.
   *
   * After calling this, the database instance should not be used.
   */
  close(): void {
    if (this.native && !this._closed) {
      this.native.close();
      this.native = null;
      this._closed = true;
    }
  }

  /**
   * Get unique artwork IDs (mhii_link values) from all tracks.
   *
   * This method collects all unique non-zero mhii_link values from tracks
   * in the database. These IDs reference artwork entries in the ArtworkDB
   * and can be used for artwork deduplication.
   *
   * @returns Array of unique artwork IDs (mhii_link values)
   *
   * @example
   * ```typescript
   * const db = Database.openSync('/media/ipod');
   * const artworkIds = db.getUniqueArtworkIds();
   * console.log(`Found ${artworkIds.length} unique artwork entries`);
   * ```
   */
  getUniqueArtworkIds(): number[] {
    const native = this.ensureOpen();
    return native.getUniqueArtworkIds();
  }

  /**
   * Ensure the database is closed when garbage collected.
   */
  [Symbol.dispose](): void {
    this.close();
  }
}
