---
id: TASK-015
title: Implement collection adapter
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-013
  - TASK-011
references:
  - docs/ARCHITECTURE.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the collection adapter based on the decision from TASK-013.

**Implementation:**
- CollectionAdapter interface (already stubbed in podkit-core)
- Concrete adapter implementation (beets and/or directory)
- Read tracks with full metadata

**Testing requirements:**
- Unit tests for adapter with mock data
- Test various audio formats (FLAC, MP3, M4A, OGG)
- Test edge cases: missing metadata, unicode, special characters
- Integration tests with real audio files (small test fixtures)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CollectionAdapter implementation complete
- [ ] #2 Reads tracks with full metadata
- [ ] #3 Unit tests with mock data
- [ ] #4 Integration tests with test audio fixtures
- [ ] #5 Handles edge cases (missing metadata, unicode, etc.)
<!-- AC:END -->
