---
title: Architecture
description: Technical architecture overview of podkit including component design, interfaces, and data flow.
sidebar:
  order: 1
---

# Architecture Overview

This document covers the technical architecture of podkit, including component design, interfaces, and data flow.

## System Context

```
+-----------------------------------------------------------------------------+
|                              User Environment                                |
|                                                                             |
|                          +------------------+                               |
|                          |  Music Directory |                               |
|                          |   (FLAC, MP3,    |                               |
|                          |    M4A, etc.)    |                               |
|                          +--------+---------+                               |
|                                   |                                         |
|                                   v                                         |
|                          +----------------+                                 |
|                          |     podkit     |                                 |
|                          |      CLI       |                                 |
|                          +--------+-------+                                 |
|                              |                                              |
|         +--------------------+--------------------+                         |
|         |                    |                    |                         |
|         v                    v                    v                         |
|  +--------------+    +--------------+    +--------------+                  |
|  |    FFmpeg    |    |   libgpod    |    |   System     |                  |
|  |  (transcode) |    |  (via node)  |    |   Storage    |                  |
|  +--------------+    +------+-------+    +--------------+                  |
|                              |                                              |
+------------------------------+----------------------------------------------+
                               |
                               v
                        +--------------+
                        |    iPod      |
                        |   Device     |
                        +--------------+
```

## Package Architecture

podkit is organized as a monorepo with these main packages:

```
packages/
+-- libgpod-node/          # Native N-API bindings for libgpod (internal)
|   +-- src/
|   |   +-- binding.ts     # Native binding layer
|   |   +-- database.ts    # iTunesDB operations
|   |   +-- photo-database.ts # Photo database operations
|   |   +-- track.ts       # Track utilities (rating, duration, media type)
|   |   +-- types.ts       # TypeScript definitions
|   +-- native/            # C++ binding code (N-API)
|
+-- podkit-core/           # Core sync logic + iPod abstraction
|   +-- src/
|   |   +-- ipod/          # IpodDatabase abstraction layer
|   |   +-- adapters/      # Collection source adapters (directory, subsonic)
|   |   +-- sync/          # Sync engine (differ, planner, executor)
|   |   +-- transcode/     # Audio transcoding (FFmpeg)
|   |   +-- video/         # Video transcoding, probing, compatibility
|   |   +-- artwork/       # Artwork extraction and processing
|   |   +-- transforms/    # Metadata transforms (e.g., ft-in-title)
|   |   +-- device/        # Device detection, mounting, ejecting
|   |   +-- metadata/      # Metadata extraction utilities
|   |   +-- config/        # Configuration types
|   +-- index.ts
|
+-- podkit-cli/            # CLI application (Commander.js)
|   +-- src/
|       +-- commands/       # sync, device, collection, init, eject, mount
|       +-- config/         # Config loading and merging
|       +-- output/         # Output formatting (OutputContext)
|       +-- main.ts
|
+-- gpod-testing/          # Test utilities for iPod environments
|   +-- src/
|       +-- test-ipod.ts   # createTestIpod, withTestIpod
|       +-- gpod-tool.ts   # gpod-tool CLI wrapper
|
+-- e2e-tests/             # End-to-end CLI tests
    +-- src/
        +-- workflows/     # Full CLI workflow tests
        +-- targets/       # Dummy/real iPod target abstraction
        +-- helpers/       # CLI runner utilities
        +-- docker/        # Docker container management
        +-- sources/       # Test collection sources

tools/
+-- gpod-tool/             # C CLI for iPod database operations
+-- libgpod-macos/         # macOS build scripts for libgpod
```

### Layer Diagram

```
+-------------------------------------------------------------+
|                       podkit-cli                            |
|                    (CLI commands)                           |
+---------------------------+---------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|                      podkit-core                            |
|  +-------------------+  +----------------+  +-----------+  |
|  |   IpodDatabase    |  |  Sync Engine   |  | Transcode |  |
|  |   (iPod access)   |  |  (diff/plan)   |  | (FFmpeg)  |  |
|  +---------+---------+  +----------------+  +-----------+  |
+------------+------------------------------------------------+
             |
             v
+-------------------------------------------------------------+
|                    libgpod-node (internal)                  |
|                 (N-API bindings for libgpod)                |
+-------------------------------------------------------------+
```

**Important:** Applications should use `IpodDatabase` from `@podkit/core`, not `@podkit/libgpod-node` directly. The libgpod-node package is an internal implementation detail.

## Component Details

### IpodDatabase (podkit-core)

The primary interface for iPod operations. `IpodDatabase` provides a clean, type-safe API that hides libgpod internals.

```typescript
import { IpodDatabase, IpodError } from '@podkit/core';

// Open an iPod and work with tracks
const ipod = await IpodDatabase.open('/Volumes/IPOD');

// Get device info
const info = ipod.getInfo();
console.log(`${info.device.modelName}: ${info.trackCount} tracks`);

// Track operations
const tracks = ipod.getTracks();
const track = ipod.addTrack({ title: 'Song', artist: 'Artist' });
track.copyFile('/path/to/song.mp3').setArtwork('/path/to/cover.jpg');

// Playlist operations
const playlist = ipod.createPlaylist('Favorites');
playlist.addTrack(track);

// Save and close
await ipod.save();
ipod.close();
```

### Collection Adapters

Adapters provide a uniform interface for reading track metadata from different sources. Current implementations include `DirectoryAdapter` (local filesystem) and `SubsonicAdapter` (Subsonic/Navidrome servers).

```typescript
interface CollectionAdapter {
  readonly name: string;

  connect(): Promise<void>;
  getTracks(): Promise<CollectionTrack[]>;
  getFilteredTracks(filter: TrackFilter): Promise<CollectionTrack[]>;
  getFileAccess(track: CollectionTrack): FileAccess | Promise<FileAccess>;
  disconnect(): Promise<void>;
}

// File access supports both local and remote sources
type FileAccess =
  | { type: 'path'; path: string }
  | { type: 'stream'; getStream: () => Promise<ReadableStream | Readable>; size?: number };
```

### Sync Engine

The sync engine has three stages: diff, plan, execute. Each stage is implemented as a separate module with its own interface.

```typescript
// Differ: Compare collection to iPod
interface SyncDiff {
  toAdd: CollectionTrack[];      // In collection, not on iPod
  toRemove: IPodTrack[];         // On iPod, not in collection
  existing: MatchedTrack[];      // Already synced
  conflicts: ConflictTrack[];    // Metadata mismatch
  toUpdate: UpdateTrack[];       // Need metadata update (e.g., transform changes)
}

// Planner: Create execution plan from diff
interface SyncPlan {
  operations: SyncOperation[];
  estimatedTime: number;
  estimatedSize: number;
  warnings: SyncWarning[];
}

// Executor: Run the plan with progress reporting
interface SyncExecutor {
  execute(plan: SyncPlan, options: ExecuteOptions): AsyncIterable<SyncProgress>;
}
```

A parallel set of types exists for video sync (`VideoSyncDiff`, `VideoSyncPlan`, etc.) in the same `sync/` module.

### Transforms

The transforms module applies metadata transformations before syncing. For example, the `ftintitle` transform moves featured artist credits from the artist field into the title (e.g., "Artist feat. Guest" becomes artist "Artist", title "Song (feat. Guest)"). Transforms are configured per-collection and tracked in the diff engine so they can be applied or reverted.

## Data Flow

### Sync Operation Flow

```
1. Initialize
   +-- Parse CLI arguments
   +-- Load configuration
   +-- Connect to collection source (adapter)
   +-- Open iPod database (IpodDatabase.open())

2. Diff
   +-- Load all collection tracks (adapter.getTracks())
   +-- Load all iPod tracks (ipod.getTracks())
   +-- Match by (artist, title, album)
   +-- Generate diff: toAdd, toRemove, existing

3. Plan
   +-- For each track to add:
   |   +-- Check if transcoding needed
   |   +-- Estimate output size
   |   +-- Create operation
   +-- Calculate total time/size
   +-- Return SyncPlan

4. Execute (if not dry-run)
   +-- For each operation:
   |   +-- Transcode if needed (FFmpeg)
   |   +-- Extract artwork
   |   +-- Add track to iPod (ipod.addTrack())
   |   +-- Copy file to iPod (track.copyFile())
   |   +-- Set artwork (track.setArtwork())
   |   +-- Report progress
   +-- Save iPod database (ipod.save())

5. Finalize
   +-- Report summary
   +-- Close database (ipod.close())
   +-- Cleanup temp files
```

### Track Matching Algorithm

Tracks are matched by normalized `(artist, title, album)` tuple. Normalization is more thorough than simple lowercasing:

1. **Case**: Convert to lowercase
2. **Whitespace**: Trim and collapse internal whitespace
3. **Unicode**: NFD normalization, then strip combining characters (accents)
4. **Articles**: "The Beatles" and "Beatles, The" normalize to the same form
5. **Placeholders**: Values like "unknown" or "\<unknown\>" are treated as empty

The matching module builds a `Map` index of iPod tracks by match key, then looks up each collection track. Unmatched collection tracks become `toAdd`, unmatched iPod tracks become `toRemove`, and matched pairs are checked for metadata conflicts or transform updates.

When transforms are configured, matching also considers the transformed metadata. For example, if the `ftintitle` transform is enabled, a collection track with artist "Artist feat. Guest" will match an iPod track with artist "Artist" and title containing "(feat. Guest)".

## Error Handling

### Error Handling

The sync engine uses skip-and-continue error handling — individual track failures don't stop the overall sync. Errors are collected and reported at the end.

The `IpodError` class in `podkit-core` provides structured error codes (`NOT_FOUND`, `DATABASE_CORRUPT`, `INIT_FAILED`, etc.) for iPod database operations.

### Recovery Strategies

| Error | Recovery |
|-------|----------|
| Transcode failure | Skip track, continue sync, report at end |
| Copy failure | Retry once, then skip and report |
| Database write failure | Attempt rollback, report critical error |
| Space exhaustion | Stop sync, report partial completion |
| Device disconnect | Stop immediately, report status |

## Video Sync Pipeline

Video sync follows the same diff-plan-execute pattern as music sync but with its own types:

- **VideoDirectoryAdapter**: Scans directories for video files, probes metadata with FFmpeg
- **VideoSyncDiffer**: Matches videos by title/content type
- **VideoSyncPlanner**: Checks device compatibility, decides between passthrough and transcoding
- **VideoSyncExecutor**: Transcodes (H.264/M4V) and copies to iPod

Device profiles define resolution and bitrate limits per iPod generation (e.g., iPod Video supports 320x240, iPod Classic supports 640x480).

## See Also

- [Development Setup](/developers/development) - Setting up dev environment
- [Testing](/developers/testing) - Testing strategy
- [ADRs](/developers/adr/) - Architecture decision records
