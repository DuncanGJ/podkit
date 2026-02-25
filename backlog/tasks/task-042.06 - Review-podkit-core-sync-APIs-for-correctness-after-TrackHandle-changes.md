---
id: TASK-042.06
title: Review podkit-core sync APIs for correctness after TrackHandle changes
status: To Do
assignee: []
created_date: '2026-02-25 13:38'
labels:
  - podkit-core
  - architecture
dependencies:
  - TASK-042
parent_task_id: TASK-042
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the TrackHandle migration, review podkit-core's public APIs and internal methods to ensure they're designed correctly.

## Review Areas

### Sync Plan Types (`sync/types.ts`)
- `RemoveOperation` has a `track` with `id` field - is this still valid?
- Should sync operations reference tracks by handle or by metadata?
- Consider: sync plans may be serialized/persisted - handles won't survive that

### Collection Adapters
- How do adapters identify tracks for removal?
- Is there a mismatch between collection track IDs and iPod track references?

### Diff Algorithm
- How does diffing work between collection tracks and iPod tracks?
- What identifiers are used for matching?

## Questions to Answer

1. Should `RemoveOperation.track.id` be the iPod's `track->id` or something else?
2. If sync plans are persisted, how do we reference tracks?
3. Is `track->dbid` a better identifier for matching existing tracks?

## Documentation

After review, update:
- `docs/ARCHITECTURE.md` if needed
- Code comments explaining identifier usage
- Any ADRs if significant decisions are made
<!-- SECTION:DESCRIPTION:END -->
