---
id: TASK-026
title: Implement skip-and-continue error handling
status: To Do
assignee: []
created_date: '2026-02-22 19:38'
labels: []
milestone: 'M3: Production Ready (v1.0.0)'
dependencies:
  - TASK-021
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement robust error handling that doesn't stop sync on individual failures.

**Behavior:**
- If a track fails (transcode error, copy error, etc.), skip it and continue
- Collect all errors during sync
- Report summary at end: "Synced 95/100 tracks, 5 failures"
- Log detailed error info for debugging

**Optional enhancement:**
- `podkit sync --retry-failed` to retry just the failed tracks from last sync
- Store failed track list in temp file

**Testing requirements:**
- Test with intentionally bad files mixed in
- Verify good files still sync
- Verify error summary is accurate
- Test error logging
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Failed tracks skipped, sync continues
- [ ] #2 Errors collected and reported at end
- [ ] #3 Detailed error logging available
- [ ] #4 Tests with mixed good/bad files
<!-- AC:END -->
