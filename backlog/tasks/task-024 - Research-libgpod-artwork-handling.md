---
id: TASK-024
title: Research libgpod artwork handling
status: To Do
assignee: []
created_date: '2026-02-22 19:38'
updated_date: '2026-02-22 19:39'
labels:
  - research
milestone: 'M3: Production Ready (v1.0.0)'
dependencies:
  - TASK-023
references:
  - docs/LIBGPOD.md
  - docs/IPOD-INTERNALS.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify that libgpod handles artwork resizing and format conversion automatically.

**Expected behavior (to verify):**
- libgpod detects iPod model and supported artwork formats
- itdb_track_set_thumbnails accepts source image and handles conversion
- Multiple required sizes generated automatically

**Research:**
- Review libgpod documentation for artwork functions
- Test with spike code from TASK-005
- Document any preprocessing we need to do (if any)

**Outcome:** Confirm we can pass source image to libgpod and it handles the rest, or document what preprocessing is required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 libgpod artwork handling verified
- [ ] #2 Document what (if any) preprocessing needed
- [ ] #3 Update TASK-025 with findings
<!-- AC:END -->
