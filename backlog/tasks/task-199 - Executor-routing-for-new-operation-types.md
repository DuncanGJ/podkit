---
id: TASK-199
title: Executor routing for new operation types
status: To Do
assignee: []
created_date: '2026-03-23 14:08'
labels:
  - feature
  - core
  - sync
milestone: 'Transfer Mode: iPod Support'
dependencies:
  - TASK-197
  - TASK-198
references:
  - packages/podkit-core/src/sync/music-executor.ts
  - packages/podkit-core/src/sync/handlers/music-handler.ts
documentation:
  - backlog/docs/doc-012 - Spec--Transfer-Mode-Behavior-Matrix.md
  - backlog/docs/doc-014 - Spec--Operation-Types-&-Sync-Tags.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire the music executor to handle the new granular operation types. The executor is the bridge between what the planner decides and what actually happens — it routes each operation type to the correct processing path.

**PRD:** DOC-011 (Transfer Mode)

**add-direct-copy / upgrade-direct-copy:**
- Same as current copy path — file is copied byte-for-byte to device
- No FFmpeg involvement

**add-optimized-copy / upgrade-optimized-copy:**
- Route through FFmpeg using optimized-copy args from TASK-198
- Audio is stream-copied (no re-encoding), artwork is stripped
- Output file goes to device
- For upgrades: remove old file, add new processed file

**add-transcode / upgrade-transcode:**
- Same as current transcode path but uses transferMode to determine artwork handling
- `fast`/`optimized`: strip artwork, `portable`: preserve artwork
- Already partially implemented via TASK-198 FFmpeg arg changes

**Key integration points:**
- The executor's pipeline (Downloader → Preparer → Consumer) needs to handle optimized-copy as a new processing mode — it's similar to transcode (runs FFmpeg) but with different args
- Progress reporting should work for optimized-copy operations (FFmpeg progress pipe)
- Error handling for FFmpeg failures on optimized-copy path
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 add-direct-copy operations copy file to device without FFmpeg (fast path)
- [ ] #2 add-optimized-copy operations route through FFmpeg with stream-copy args to strip artwork
- [ ] #3 add-transcode operations use transferMode to determine artwork handling in FFmpeg args
- [ ] #4 upgrade-direct-copy, upgrade-optimized-copy, upgrade-transcode route through same paths as their add equivalents
- [ ] #5 Progress reporting works for optimized-copy operations via FFmpeg progress pipe
- [ ] #6 E2E: syncing MP3 files with transferMode='optimized' produces artwork-stripped files on device
- [ ] #7 E2E: syncing MP3 files with transferMode='fast' produces byte-identical copies on device
<!-- AC:END -->
