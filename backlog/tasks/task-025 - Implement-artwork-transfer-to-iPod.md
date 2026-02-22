---
id: TASK-025
title: Implement artwork transfer to iPod
status: To Do
assignee: []
created_date: '2026-02-22 19:38'
updated_date: '2026-02-22 19:39'
labels: []
milestone: 'M3: Production Ready (v1.0.0)'
dependencies:
  - TASK-024
  - TASK-021
references:
  - docs/LIBGPOD.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Transfer artwork to iPod via libgpod.

**Implementation:**
- Extract embedded artwork (from TASK-023)
- Pass to libgpod (itdb_track_set_thumbnails or equivalent)
- libgpod should handle resizing/format conversion based on device capabilities

**Note:** TASK-024 will confirm libgpod handles resize/format. Adjust implementation if preprocessing needed.

**Testing requirements:**
- Integration test with test iPod environment
- Verify artwork appears correctly on device
- Test tracks with and without artwork in same sync
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Artwork extracted and passed to libgpod
- [ ] #2 libgpod handles device-specific formatting
- [ ] #3 Integration test verifies artwork works
- [ ] #4 Handles tracks without artwork gracefully
<!-- AC:END -->
