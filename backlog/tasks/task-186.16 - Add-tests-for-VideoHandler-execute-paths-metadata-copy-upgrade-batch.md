---
id: TASK-186.16
title: 'Add tests for VideoHandler execute paths (metadata, copy-upgrade, batch)'
status: To Do
assignee: []
created_date: '2026-03-22 12:57'
labels:
  - testing
dependencies: []
references:
  - packages/podkit-core/src/sync/handlers/video-handler.ts
  - packages/podkit-core/src/sync/handlers/video-handler-execute.test.ts
parent_task_id: TASK-186
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

Several `VideoHandler` execution methods have zero or partial test coverage:

1. **`executeUpdateMetadata`** — zero tests. Has three distinct branches: tvshow metadata, movie metadata, and seriesTitle-only updates. Each branch calls different iPod database methods.

2. **`executeUpgrade` copy path** — only the transcode variant is tested. When `op.settings` is undefined, the upgrade uses a copy instead of transcode. This path is untested.

3. **`executeBatch`** — the shared temp directory lifecycle (create before first transcode, cleanup in `finally`) and `hasTranscodes` detection are untested.

4. **`setVideoQuality` + sync tag writing** — when `this.videoQuality` is set, `executeTranscode` writes sync tags after transcoding. This path is untested.

## What to test

Add to `packages/podkit-core/src/sync/handlers/video-handler-execute.test.ts`:

### executeUpdateMetadata
- TV show metadata update: verify `ipod.setTrackInfo` called with updated season/episode/year
- Movie metadata update: verify title/year updated
- Series title transform: verify `seriesTitle` applied without other metadata changes
- Error handling: track not found on device

### executeUpgrade (copy path)
- Upgrade without settings → copies file instead of transcoding
- Verify old track removed, new track added, no `transcodeVideo` call

### executeBatch
- Creates temp directory when plan has transcodes
- Cleans up temp directory in `finally` (even on error)
- Skips temp directory when no transcodes needed
- Passes temp directory to individual execute calls

### setVideoQuality
- When set, sync tags are written after transcode
- When not set, no sync tag writing
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 executeUpdateMetadata tested for tvshow, movie, and seriesTitle-only branches
- [ ] #2 executeUpgrade copy path (no settings) tested
- [ ] #3 executeBatch temp directory lifecycle tested (create, cleanup, skip when no transcodes)
- [ ] #4 setVideoQuality sync tag writing path tested
<!-- AC:END -->
