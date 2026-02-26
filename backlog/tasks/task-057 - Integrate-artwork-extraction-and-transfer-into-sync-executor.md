---
id: TASK-057
title: Integrate artwork extraction and transfer into sync executor
status: To Do
assignee: []
created_date: '2026-02-26 11:37'
labels:
  - bug
  - sync
  - artwork
  - e2e-finding
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Bug found in E2E testing (TASK-029)**

Artwork is not transferred during sync. The building blocks exist but aren't wired together:
- `extractArtwork()` function exists in `@podkit/core`
- `track.setArtwork()` / `track.setArtworkFromData()` methods exist on `IPodTrack`

But the sync executor (`executor.ts`) never calls these functions.

**Implementation needed:**
1. In `executeTranscode()` and `executeCopy()`:
   - Extract artwork from source file using `extractArtwork()`
   - If artwork exists, call `track.setArtworkFromData()` or write to temp file and call `track.setArtwork()`
2. Respect the `artwork` config option (skip if disabled)
3. Handle artwork errors gracefully (skip artwork, continue sync)

**Related:**
- TASK-025 implemented the libgpod binding
- TASK-023 implemented artwork extraction
- This task wires them together in the sync flow
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Artwork extracted from source files during sync
- [ ] #2 Artwork transferred to iPod via setArtwork API
- [ ] #3 Config artwork option respected
- [ ] #4 Artwork errors handled gracefully (skip, continue)
- [ ] #5 Integration test verifies artwork on synced tracks
<!-- AC:END -->
