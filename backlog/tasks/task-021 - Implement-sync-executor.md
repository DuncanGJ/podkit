---
id: TASK-021
title: Implement sync executor
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-020
  - TASK-019
  - TASK-010
references:
  - docs/ARCHITECTURE.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the executor that runs a sync plan.

**Execution flow:**
1. For each operation in plan:
   - Transcode if needed (TASK-019)
   - Extract artwork (can be deferred to M3)
   - Add track to iPod database (TASK-010)
   - Copy file to iPod
   - Report progress
2. Write iPod database

**Implementation:**
- Progress reporting (async iterator or callbacks)
- Error handling and recovery
- Dry-run support (simulate without writing)

**Testing requirements:**
- Unit tests with mocked dependencies
- Integration test with test iPod environment
- Test progress reporting
- Test error recovery
- Test dry-run mode
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Executor runs sync plan correctly
- [ ] #2 Progress reporting works
- [ ] #3 Dry-run mode implemented
- [ ] #4 Error handling and recovery
- [ ] #5 Integration test with test iPod environment
<!-- AC:END -->
