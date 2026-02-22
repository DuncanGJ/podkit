---
id: TASK-017
title: Implement song matching strategy with tests
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-016
references:
  - docs/ARCHITECTURE.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the algorithm for matching songs between collection and iPod.

**Matching strategy:**
- Primary: (artist, title, album) tuple - normalized and compared
- Normalization: lowercase, trim whitespace, handle unicode
- Consider: fuzzy matching for slight variations?

**Implementation:**
- Matching function that compares two tracks
- Normalization utilities
- Configurable matching strictness?

**Testing requirements (critical):**
- Exact matches
- Case differences ("The Beatles" vs "the beatles")
- Whitespace differences
- Unicode normalization (é vs e)
- Partial matches / near-misses (should NOT match)
- Edge cases: empty fields, "Unknown Artist", etc.

**This powers the diff engine - needs extensive test coverage.**
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Matching algorithm implemented
- [ ] #2 Normalization handles case, whitespace, unicode
- [ ] #3 Extensive unit tests for match scenarios
- [ ] #4 Tests for non-matches (false positive prevention)
- [ ] #5 Edge cases tested and documented
<!-- AC:END -->
