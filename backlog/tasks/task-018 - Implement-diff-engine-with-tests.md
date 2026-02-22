---
id: TASK-018
title: Implement diff engine with tests
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-017
  - TASK-009
references:
  - docs/ARCHITECTURE.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the engine that compares collection tracks to iPod tracks.

**Diff output:**
- toAdd: tracks in collection but not on iPod
- toRemove: tracks on iPod but not in collection
- existing: matched tracks (already synced)

**Implementation:**
- Use song matching from TASK-017
- Efficient comparison (indexing, not O(n²))
- Handle large collections (10k+ tracks)

**Testing requirements (critical):**
- Empty collection / empty iPod
- Identical collection and iPod (nothing to sync)
- All new tracks (fresh iPod)
- Mixed scenario (some new, some existing, some removed)
- Large collection performance test
- Verify no false positives (existing tracks marked as new)
- Verify no false negatives (new tracks missed)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Diff engine produces correct toAdd, toRemove, existing lists
- [ ] #2 Uses efficient indexing (not O(n²))
- [ ] #3 Handles 10k+ track collections
- [ ] #4 Extensive unit tests for all scenarios
- [ ] #5 No false positives or negatives in matching
- [ ] #6 Performance test for large collections
<!-- AC:END -->
