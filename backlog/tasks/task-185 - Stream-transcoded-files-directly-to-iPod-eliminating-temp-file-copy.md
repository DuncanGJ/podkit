---
id: TASK-185
title: 'Stream transcoded files directly to iPod, eliminating temp-file copy'
status: To Do
assignee: []
created_date: '2026-03-21 22:40'
updated_date: '2026-03-21 22:43'
labels:
  - performance
  - libgpod-node
  - sync
dependencies: []
references:
  - packages/libgpod-node/native/track_operations.cc
  - packages/podkit-core/src/sync/executor.ts
  - packages/podkit-core/src/sync/video-executor.ts
  - packages/libgpod-node/src/database.ts
  - packages/podkit-core/src/transcode/ffmpeg.ts
  - packages/podkit-core/src/video/transcode.ts
  - tools/libgpod-macos/build/libgpod-0.8.3/src/itdb_itunesdb.c
  - packages/podkit-core/src/adapters/subsonic.ts
  - packages/podkit-core/src/utils/stream.ts
documentation:
  - packages/libgpod-node/README.md
  - docs/developers/libgpod.md
  - docs/devices/ipod-internals.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently, transcoding (audio and video) writes to a local temp file, then `itdb_cp_track_to_ipod` copies that file to the device — doubling the I/O. For video files this creates a noticeable delay at the end of each transcode while the file is copied over USB.

The optimization: stream FFmpeg output (or copy source files) directly to the final device path, bypassing the temp file and the libgpod copy entirely. USB 2.0 throughput (~25-35 MB/s) far exceeds transcode output bitrate (~0.1-5 MB/s), so the device is not a bottleneck.

This requires new native bindings in libgpod-node that separate path generation from file copying — letting libgpod allocate the `iPod_Control/Music/F##/` path and update the track's `ipod_path`, but without performing the actual file copy. The caller then writes directly to that path and finalizes the track metadata (size, transferred flag).

### Affected code paths

1. **Audio transcode + add** (`executor.ts` — `executeTranscode`): FFmpeg → temp .m4a → `copyFile()` → device
2. **Video transcode + add** (`video-executor.ts` — `executeTranscode`): FFmpeg → temp .m4v → `copyFile()` → device
3. **Non-transcoded compatible files** (MP3, AAC copied without transcoding): source → `copyFile()` → device. These can stream-copy directly to the device path too.
4. **Self-healing sync / file replacement** (`executor.ts` — `replaceTrackFile`): also calls `itdb_cp_track_to_ipod` under the hood via `ReplaceTrackFile` in the native binding.
5. **Remote source files** (Subsonic adapter): These download to temp first via `streamToTempFile()`, then transcode, then copy. The download-to-temp step is unchanged, but the transcode/copy-to-device step benefits from the same optimization.

### libgpod internals: how `itdb_cp_track_to_ipod` works

Source: `tools/libgpod-macos/build/libgpod-0.8.3/src/itdb_itunesdb.c`

**Three-step process (lines 7567-7595):**
1. Early return if `track->transferred == TRUE` (no-op)
2. `itdb_cp_get_dest_filename()` — generates destination path (or reuses existing `ipod_path`)
3. `itdb_cp()` + `itdb_cp_finalize()` — copies file and updates track fields

**Path generation (`itdb_cp_get_dest_filename`, lines 7267-7396):**
- Counts existing `F00`-`F49` music directories via `itdb_musicdirs_number()`
- Selects a random directory: `g_random_int_range(0, musicdirs_number)` → formatted as `F%02d`
- Generates random basename: `libgpod<6-digit-random>.<lowercase-extension>` (range 0-900000, increments on collision)
- Example: `:iPod_Control:Music:F07:libgpod482931.m4a`
- Paths use colon separators internally; libgpod converts via `itdb_filename_ipod2fs()` / `itdb_filename_fs2ipod()`

**`filetype_marker` generation (`itdb_cp_finalize`, lines 7437-7534):**
- Extracts file extension from destination filename
- Encodes as 4-byte big-endian value, uppercase, space-padded:
  ```c
  for (i=1; i<=4; ++i) {  // skip the '.'
    marker = marker << 8;
    if (strlen(suffix) > i) marker |= g_ascii_toupper(suffix[i]);
    else marker |= ' ';
  }
  ```
- Known values: `.mp3` → `0x4D503320` ("MP3 "), `.m4a` → `0x4D344120` ("M4A "), `.m4v` → `0x4D345620` ("M4V "), `.wav` → `0x57415620` ("WAV ")
- **Critical**: The iPod firmware uses this for decoder selection. Wrong value = silent playback failure.

### Database save timing

- **Checkpoint saves**: Every N operations (default: 50 for music, 10 for video) via `saveInterval`
- **Final save**: Once at the end of the pipeline
- **Crash window**: Between `copyFile()` completing and the next checkpoint save, up to N-1 tracks could be in the DB in-memory but not persisted. With direct-write, this window is the same — the risk doesn't change.
- **No transaction semantics**: There's no atomic "file + DB entry" operation today, and this task doesn't change that.

### Interaction with graceful shutdown (tasks 180/182/183)

The graceful shutdown work adds:
- SIGINT handling that drains the current operation and saves the DB
- Checkpoint saves in the video executor
- Daemon abort → SIGINT forwarding to sync child process

Direct-write **improves** graceful shutdown because there's no separate copy step to complete or roll back. On abort:
- Kill FFmpeg (already handled)
- The partial file is on the device at the prepared path
- `transferred` is false, DB not saved → cleanup sweep handles it
- No temp file on local disk to clean up

### Approach

**New native bindings in libgpod-node:**

1. `prepareTrackPath(handle, sourceExtension)` — Replicates `itdb_cp_get_dest_filename()` logic: selects random `F##` directory, generates `libgpod######.ext` filename, creates directory if needed, sets `track->ipod_path`. Also computes and sets `filetype_marker` using the same encoding as `itdb_cp_finalize()`. Returns the full filesystem path. Does NOT copy any file or set `transferred`.

2. `finalizeTrackTransfer(handle, fileSize)` — Sets `track->transferred = true` and `track->size = fileSize`. Called after the file has been fully written to the device path.

**Updated sync flow (transcode case):**
```
addTrack(metadata)
  → prepareTrackPath(handle, ".m4a") → returns "/Volumes/iPod/iPod_Control/Music/F07/libgpod482931.m4a"
  → FFmpeg -o <device-path>          → writes directly to device
  → finalizeTrackTransfer(handle, fileSize)
```

**Updated sync flow (direct copy case):**
```
addTrack(metadata)
  → prepareTrackPath(handle, ".mp3") → returns device path
  → fs.copyFile(source, devicePath)  → copies directly to device
  → finalizeTrackTransfer(handle, fileSize)
```

**Updated replaceTrackFile flow:**
```
delete old file from device
clear ipod_path, reset transferred
  → prepareTrackPath(handle, ".m4a") → returns new device path
  → FFmpeg/copy → write to new path
  → finalizeTrackTransfer(handle, fileSize)
```

**Cleanup sweep:**
On sync start, scan `iPod_Control/Music/F##/` directories for files not referenced by any track in the database. Remove orphans. This handles:
- Cancelled syncs that left partial files
- Unexpected device unmounts
- Any inconsistency between filesystem and database state

### Backwards compatibility

The existing `copyTrackToDevice` and `replaceTrackFile` native bindings should be **kept** — they still work and are useful as a fallback. The new `prepareTrackPath` + `finalizeTrackTransfer` bindings are an alternative path that the sync executors will prefer.

### Key edge cases

- **`filetype_marker`**: Must be set correctly by `prepareTrackPath` using the same algorithm as libgpod. Known values documented above.
- **Cancellation / abort mid-write**: Partial file on device at prepared path. `transferred` is false, DB not saved. Cleanup sweep handles it.
- **Unexpected device unmount**: Same as cancellation — partial file, no DB entry persisted.
- **FAT32 constraints**: No hardlinks/symlinks. Path generation must respect 8.3 or VFAT long filename limits (libgpod uses ~20-char names, well within limits).
- **Directory creation**: `F##` directories may not all exist. `prepareTrackPath` must create the directory if needed (libgpod does this in `itdb_cp_get_dest_filename`).
- **Disk space exhaustion mid-write**: Partial file on device. Same cleanup sweep handles it.
- **Filename collision**: libgpod increments the random number on collision. `prepareTrackPath` must do the same.
- **Remote sources (Subsonic)**: Download-to-temp is unchanged. The optimization applies to the transcode/copy-to-device step that follows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 New native binding `prepareTrackPath` generates and assigns an iPod device path for a track without copying any file, including setting `filetype_marker` correctly
- [ ] #2 New native binding `finalizeTrackTransfer` marks a track as transferred with the correct file size
- [ ] #3 Audio sync executor streams FFmpeg transcode output directly to the device path instead of writing to a local temp file then copying
- [ ] #4 Video sync executor streams FFmpeg transcode output directly to the device path instead of writing to a local temp file then copying
- [ ] #5 Non-transcoded compatible files (direct copies) are written directly to the device path
- [ ] #6 Self-healing sync file replacement uses the direct-write path instead of the existing `itdb_cp_track_to_ipod` copy
- [ ] #7 Cancellation mid-write cleans up the partial file from the device
- [ ] #8 Pre-sync cleanup sweep detects and removes orphaned files from interrupted previous syncs
- [ ] #9 Existing tests pass and new tests cover the direct-write path, cancellation cleanup, and orphan detection
<!-- AC:END -->
