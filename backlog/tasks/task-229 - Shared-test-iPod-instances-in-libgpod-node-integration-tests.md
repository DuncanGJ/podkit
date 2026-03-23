---
id: TASK-229
title: Shared test iPod instances in libgpod-node integration tests
status: To Do
assignee: []
created_date: '2026-03-23 20:34'
updated_date: '2026-03-23 20:34'
labels:
  - testing
  - performance
  - refactor
milestone: m-15
dependencies:
  - TASK-227
  - TASK-228
documentation:
  - backlog/documents/doc-021 - Test Suite Performance Plan.md
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the 12 libgpod-node integration test files to share iPod instances per `describe` block instead of creating one per test via `withTestIpod`. This is the largest refactor in the milestone, touching 242 `withTestIpod` call sites.

## Context

The libgpod-node package has 285 integration tests across 12 files, with 242 `withTestIpod` calls. Even with template-based creation (fast), the test code is cluttered with per-test iPod lifecycle management. Sharing instances per file improves both speed and clarity.

## Approach

For each test file:
1. Create one (or a few) iPod instances in `beforeAll`
2. Use `resetTestIpod()` (from the database reset helper task) in `beforeEach` to clean state between tests
3. Replace `withTestIpod(async (ipod) => { ... })` wrappers with direct use of the shared instance
4. Tests that need a specific model or unusual setup can still create their own instance

## Files to refactor (242 call sites)

| File | Calls | Notes |
|------|-------|-------|
| smart-playlists.integration.test.ts | 45 | Largest file |
| artwork.integration.test.ts | 28 | |
| tracks.integration.test.ts | 27 | |
| database.integration.test.ts | 26 | |
| playlists.integration.test.ts | 24 | |
| chapters.integration.test.ts | 19 | |
| photos.integration.test.ts | 19 | |
| copy-track-twice.integration.test.ts | 13 | |
| edge-cases-investigation.integration.test.ts | 13 | |
| artwork-deduplication.integration.test.ts | 11 | |
| video-tracks.integration.test.ts | 10 | |
| video-removal-criticals.integration.test.ts | 7 | |

## Key concern: test isolation

Each test must leave no state that affects subsequent tests. The `resetTestIpod()` function handles this, but audit each file to confirm no tests depend on filesystem state outside the iPod database (e.g. temp files created alongside the iPod).

## Dependencies

- Pre-built iPod database templates (for fast creation)
- Database reset helper (for clean state between tests)

## Reference

See doc-021 (Test Suite Performance Plan), opportunity #2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 12 integration test files refactored to use shared iPod instances
- [ ] #2 withTestIpod calls reduced from 242 to ≤20 (only for tests needing non-default models)
- [ ] #3 All existing tests continue to pass
- [ ] #4 No test-order dependencies introduced (tests pass when run individually)
- [ ] #5 beforeEach uses resetTestIpod() to ensure clean state
<!-- AC:END -->
