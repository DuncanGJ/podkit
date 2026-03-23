---
id: TASK-139
title: Design and implement playlist support in podkit CLI
status: To Do
assignee: []
created_date: '2026-03-16 13:02'
updated_date: '2026-03-23 20:35'
labels:
  - cli
  - feature
  - design
dependencies: []
references:
  - >-
    packages/podkit-core/src/ipod/database.ts (lines 666-843 - existing playlist
    API)
  - packages/podkit-core/src/ipod/playlist.ts (IpodPlaylistImpl)
  - packages/libgpod-node/native/playlist_operations.cc (low-level bindings)
documentation:
  - backlog/docs/doc-020 - Architecture--Multi-Device-Support-Decisions.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
podkit currently has no CLI commands or sync-level support for reading or managing playlists on the iPod. The low-level libgpod-node bindings for playlist CRUD exist (TASK-040.02, TASK-046), and the IpodDatabase abstraction layer exposes playlist operations, but nothing in the CLI or sync flow uses them.

This task is to research and design how playlists should be exposed to users, including:
- Reading/listing playlists on the device (`podkit device playlists` or similar)
- Creating, renaming, and deleting playlists
- Adding/removing tracks from playlists
- How playlists interact with sync (should sync manage playlists? preserve user-created ones?)
- Whether playlist definitions should be part of collection config

This is a prerequisite for any feature that needs to manage playlists during sync (e.g., video playlist management).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ADR written covering playlist management design decisions
- [ ] #2 CLI commands for listing playlists on device
- [ ] #3 CLI commands for basic playlist CRUD (create, rename, delete)
- [ ] #4 Playlist support integrated with or considered alongside sync workflow
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Multi-device considerations

This task was scoped when podkit only supported iPod. With mass-storage device support being added (DOC-020, Echo Mini milestone), playlist design must account for both device types:

**iPod playlists:**
- Stored in the iTunesDB database via libgpod
- Managed through `IpodDatabase.createPlaylist()`, `addTrackToPlaylist()`, etc.
- Both regular and smart playlists supported at the binding level (TASK-125)

**Mass-storage playlists:**
- Stored as `.m3u` / `.m3u8` files on the device filesystem
- Paths in playlist files are relative to the device root (or music root)
- Created/updated by `MassStorageAdapter` as part of the `DeviceAdapter` interface
- No smart playlist equivalent — static playlists only

**Design implications:**
- The playlist ADR (AC #1) should cover both device types and how the `DeviceAdapter` interface exposes playlist operations
- The `DeviceAdapter` interface (TASK-222) may need playlist methods: `getPlaylists()`, `createPlaylist()`, `addToPlaylist()`, `removePlaylist()`
- CLI playlist commands should work identically regardless of device type — the adapter handles the format difference
- Sync-managed playlists (if implemented) need to generate the right format per device
- Consider: should collection config define playlists that sync creates on the device? If so, the format is device-agnostic in config but device-specific on disk

**References:** DOC-020 (architecture decisions), TASK-222 (DeviceAdapter interface), devices/echo-mini.md
<!-- SECTION:NOTES:END -->
