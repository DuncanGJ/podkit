---
id: TASK-223
title: MassStorageAdapter implementation
status: To Do
assignee: []
created_date: '2026-03-23 20:30'
updated_date: '2026-03-23 20:31'
labels:
  - feature
  - core
  - device
milestone: "Additional Device Support: Echo Mini"
dependencies:
  - TASK-221
  - TASK-222
  - TASK-205
references:
  - packages/podkit-core/src/ipod/database.ts
  - devices/echo-mini.md
documentation:
  - backlog/docs/doc-020 - Architecture--Multi-Device-Support-Decisions.md
  - backlog/docs/doc-013 - Spec--Device-Capabilities-Interface.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement `MassStorageAdapter` — the `DeviceAdapter` implementation for file-based music players (Echo Mini, Rockbox, generic DAPs). This is the core new code that makes non-iPod sync possible.

**Architecture doc:** DOC-020 (decision 3: one MassStorageAdapter, configurable via DeviceCapabilities)

**How it works:**
Unlike iPod (which uses a proprietary database via libgpod), mass-storage devices are plain filesystems. "Adding a track" means copying a file to the right directory. "Removing" means deleting a file. Metadata lives in the file's tags, not a separate database.

**Key responsibilities:**
1. **Track discovery** — scan the device filesystem to find existing audio files, read metadata from tags (ID3/Vorbis)
2. **Track addition** — copy/move files to the device using the configured folder structure convention
3. **Track removal** — delete files from device, clean up empty directories
4. **Track metadata update** — write updated tags to files on device
5. **Sidecar artwork** — create/update sidecar artwork files as part of `addTrack()` when `capabilities.artworkSources` includes `'sidecar'` (the adapter handles this internally, not the sync engine)
6. **Folder structure** — organize files according to device convention (e.g., `Artist/Album/01 - Title.flac`). Convention may be configurable or derived from device type.
7. **Sync state tracking** — how does the adapter know which files it manages vs. files the user put there manually? Options: sync tags in file comments, a `.podkit` manifest file, or scan-and-match every time.

**Depends on TASK-221 (investigation) for:**
- Folder structure conventions used by Echo Mini and existing managers
- Sidecar artwork format and naming (e.g., `cover.jpg`, `folder.jpg`)
- Any device quirks around tag reading or file naming

**Depends on DeviceAdapter interface for:**
- The contract this adapter implements

**Design questions to resolve during implementation:**
- Should the adapter maintain a local manifest (`.podkit/state.json`) on the device to track managed files, or rely purely on tag-based matching?
- How to handle the case where the user has existing music on the device not managed by podkit?
- Should folder structure be a fixed convention per device type, or configurable?

**Note:** This is a single adapter configurable via `DeviceCapabilities`, not a separate adapter per device. The escape hatch for truly different devices is creating a new `DeviceAdapter` implementation, but that's not expected to be needed for the initial set of mass-storage players.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 MassStorageAdapter implements DeviceAdapter interface
- [ ] #2 getTracks() scans device filesystem and reads metadata from tags
- [ ] #3 addTrack() copies files to device with correct folder structure and naming
- [ ] #4 removeTrack() deletes files and cleans up empty directories
- [ ] #5 updateTrack() writes updated tags to files on device
- [ ] #6 Sidecar artwork created/updated as part of addTrack() when capabilities include sidecar
- [ ] #7 Folder structure follows convention discovered in TASK-221 investigation
- [ ] #8 Adapter is configurable via DeviceCapabilities (not hardcoded to Echo Mini)
- [ ] #9 Sync state tracking mechanism implemented (manifest or tag-based)
- [ ] #10 Handles pre-existing music on device gracefully (doesn't delete unmanaged files)
- [ ] #11 Unit tests cover track CRUD operations against a temporary directory
<!-- AC:END -->
