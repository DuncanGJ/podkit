---
id: TASK-040.04
title: Implement track update and utility APIs
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - tracks
dependencies: []
parent_task_id: TASK-040
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose additional libgpod track APIs:

- `itdb_track_duplicate(track)` - Duplicate a track
- `itdb_filename_on_ipod(track)` - Get full filesystem path
- `itdb_track_by_dbid(itdb, dbid)` - Find by database ID
- Track field setters - Update individual fields after creation (currently can only set at creation time)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 updateTrack(trackId, fields) modifies existing track metadata
- [ ] #2 getTrackFilePath(trackId) returns full path on iPod
- [ ] #3 duplicateTrack(trackId) creates a copy
- [ ] #4 Integration tests verify track updates persist after save()
<!-- AC:END -->
