---
id: TASK-180
title: 'Graceful shutdown: video executor incremental saves'
status: To Do
assignee: []
created_date: '2026-03-21 21:47'
labels:
  - graceful-shutdown
dependencies: []
references:
  - packages/podkit-core/src/sync/video-executor.ts
  - packages/podkit-core/src/sync/executor.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add checkpoint saves to the video executor, matching what was done for the music executor in TASK-178.

The video executor (`packages/podkit-core/src/sync/video-executor.ts`) is sequential and doesn't save at all — the CLI saves once after all video collections complete. For large video libraries, a force-quit mid-sync loses all video work.

**Changes needed:**
- Add `saveInterval` option to `VideoExecuteOptions` (default: 10 — videos are larger, fewer per sync)
- Add checkpoint save in the execution loop after each successful transfer
- The video executor has access to `this.ipod` for saves
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 VideoExecuteOptions includes saveInterval option
- [ ] #2 Database saved every N completed video transfers
- [ ] #3 Checkpoint save does not interfere with abort flow
<!-- AC:END -->
