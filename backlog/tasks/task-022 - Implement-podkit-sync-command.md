---
id: TASK-022
title: Implement podkit sync command
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
updated_date: '2026-02-22 22:16'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-021
  - TASK-006
  - TASK-032
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the main `podkit sync` command.

**Command options (from CLI stub TASK-006):**
- --source: collection source (directory path, beets)
- --device: iPod mount point (auto-detect if not specified)
- --quality: transcoding quality preset
- --dry-run: show what would be synced without doing it
- --verbose: detailed output
- --json: JSON output for scripting

**Implementation:**
- Wire up CLI to sync engine
- Progress display (spinner, progress bar)
- Summary output (tracks added, errors, etc.)

**Testing requirements:**
- Integration test of full sync flow
- Test CLI argument parsing
- Test dry-run output
- Test error display
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 podkit sync command works end-to-end
- [ ] #2 All CLI options functional
- [ ] #3 Progress display during sync
- [ ] #4 Dry-run shows planned operations
- [ ] #5 Integration test of full flow
<!-- AC:END -->
