---
id: TASK-230
title: Shared test iPod instances in podkit-core and podkit-cli integration tests
status: To Do
assignee: []
created_date: '2026-03-23 20:34'
updated_date: '2026-03-23 20:34'
labels:
  - testing
  - performance
  - refactor
milestone: "Test Suite Performance"
dependencies:
  - TASK-227
  - TASK-228
documentation:
  - backlog/documents/doc-021 - Test Suite Performance Plan.md
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply the same shared-iPod pattern from the libgpod-node refactor to the remaining packages that use `withTestIpod`.

## Scope

| Package | File | Calls |
|---------|------|-------|
| podkit-core | `ipod/database.integration.test.ts` | 34 |
| podkit-cli | `device.integration.test.ts` | 36 |
| podkit-cli | `sync.integration.test.ts` | 6 |

Total: 76 `withTestIpod` calls across 3 files.

## Approach

Same as the libgpod-node refactor:
1. Create shared iPod instances in `beforeAll`
2. Reset in `beforeEach` via `resetTestIpod()`
3. Replace `withTestIpod` wrappers with direct shared instance usage

This is a smaller scope than the libgpod-node task (3 files vs 12) and can follow the same patterns established there.

## Dependencies

- Pre-built iPod database templates
- Database reset helper
- Ideally done after the libgpod-node refactor (to follow established patterns), but not a hard dependency

## Reference

See doc-021 (Test Suite Performance Plan), opportunity #3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 3 integration test files refactored to use shared iPod instances
- [ ] #2 withTestIpod calls reduced from 76 to ≤3
- [ ] #3 All existing tests continue to pass
- [ ] #4 No test-order dependencies introduced
<!-- AC:END -->
