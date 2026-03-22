---
id: TASK-186.17
title: Add tests for MusicHandler untested branches and UnifiedExecutor video phases
status: To Do
assignee: []
created_date: '2026-03-22 12:57'
labels:
  - testing
dependencies: []
references:
  - packages/podkit-core/src/sync/handlers/music-handler.ts
  - packages/podkit-core/src/sync/handlers/music-handler.test.ts
  - packages/podkit-core/src/sync/unified-executor.ts
  - packages/podkit-core/src/sync/unified-executor.test.ts
parent_task_id: TASK-186
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

Several medium-priority test gaps exist across MusicHandler and UnifiedExecutor:

### MusicHandler gaps

1. **`detectUpdates` with `forceTranscode: true`** — this option prepends a `force-transcode` reason. Untested.
2. **`detectUpdates` with `transcodingActive: true`** — suppresses `format-upgrade` detection. Untested.
3. **`applyTransformKey`** — delegates to `getTransformMatchKeys` but never directly tested. Should verify it returns a transform-aware key.
4. **`getDeviceItems`** — filters iPod tracks by `isMusicMediaType`. Untested.
5. **`planAdd` with `customBitrate`** — the bitrate option flows through to transcode settings. Untested.

### UnifiedExecutor gaps

6. **Batch abort signal** — the `signal.aborted` check inside `executeBatch`'s loop (line ~309) is untested. Only the per-operation abort path has tests.
7. **Video operation phase mapping** — `getPhaseForOperation` maps `video-transcode` → `video-transcoding`, etc. These phases are never exercised in executor tests.

## What to test

### In `music-handler.test.ts`:
- `detectUpdates` with `forceTranscode: true` → returns array containing `force-transcode`
- `detectUpdates` with `transcodingActive: true` on a format-upgrade pair → suppresses upgrade
- `applyTransformKey` returns a key different from `generateMatchKey` when transforms apply
- `getDeviceItems` filters to music tracks only (exclude video media types)
- `planAdd` with `customBitrate` → operation settings reflect the bitrate

### In `unified-executor.test.ts`:
- Abort signal during batch execution stops yielding
- Video operation types yield correct phase strings (`video-transcoding`, `video-copying`, `video-removing`, `video-upgrading`, `video-updating-metadata`)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 MusicHandler.detectUpdates tested with forceTranscode and transcodingActive options
- [ ] #2 MusicHandler.applyTransformKey directly tested
- [ ] #3 MusicHandler.getDeviceItems tested (filters by music media type)
- [ ] #4 UnifiedExecutor batch abort signal path tested
- [ ] #5 UnifiedExecutor video operation phase mapping tested
<!-- AC:END -->
