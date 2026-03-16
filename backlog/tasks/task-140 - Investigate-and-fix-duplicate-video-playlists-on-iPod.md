---
id: TASK-140
title: Investigate and fix duplicate video playlists on iPod
status: To Do
assignee: []
created_date: '2026-03-16 13:02'
labels:
  - bug
  - video
  - sync
dependencies:
  - TASK-139
references:
  - packages/podkit-core/src/sync/video-executor.ts
  - packages/podkit-core/src/sync/video-differ.ts
  - packages/podkit-core/src/ipod/video.ts (TV show metadata formatting)
  - >-
    packages/podkit-cli/src/commands/sync.ts (lines 1106-1125 - iPod video track
    reading)
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User reports that after video syncing, many duplicate video playlists appear on the iPod device. It's unclear whether they all appeared at once or accumulated across multiple sync runs.

## Investigation findings so far

The video sync code path (video-executor.ts, video-planner.ts, video-differ.ts) does **not** create any playlists explicitly. Videos are added via `ipod.addTrack()` + `track.copyFile()` with no playlist operations.

The "video playlists" visible on the iPod are likely one of:

1. **TV Show album groupings** — TV episodes get `album` set to `"Series Name, Season X"` (video.ts:104) and the iPod firmware groups these in the Videos menu. If the differ fails to match existing videos on re-sync, duplicates accumulate and appear as duplicate groupings.

2. **mhsd5 playlists** — iPods use a special playlist section (mhsd type 5) for video categories (Movies, TV Shows, etc.). These are read by libgpod on parse and written back on save. podkit doesn't manage these at all, so they may be stale or accumulating.

3. **Pre-existing playlists from iTunes** — If the iPod was previously managed by iTunes, it may have video playlists that podkit preserves but doesn't understand or clean up.

## Key areas to investigate

- Whether the video differ is correctly matching existing videos on subsequent syncs (check match key generation between collection and iPod sides)
- Whether mhsd5 playlists need to be managed/cleaned during video sync
- What `podkit sync -t video --dry-run` reports on a device with the duplicate playlists (are videos being re-added?)
- Whether `podkit device info` or playlist listing shows the duplicate playlists

## Depends on TASK-139

Proper fix likely requires playlist support in the CLI/sync layer to read, understand, and manage video playlists during sync.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Root cause of duplicate video playlists identified
- [ ] #2 Video sync does not create duplicate playlists on repeated runs
- [ ] #3 Existing duplicate playlists are cleaned up or user is given a way to clean them up
- [ ] #4 Integration test covering video re-sync does not produce duplicate playlists
<!-- AC:END -->
