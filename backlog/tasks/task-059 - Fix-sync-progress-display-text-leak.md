---
id: TASK-059
title: Fix sync progress display text leak
status: To Do
assignee: []
created_date: '2026-02-26 11:37'
labels:
  - bug
  - cli
  - cosmetic
  - e2e-finding
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Bug found in E2E testing (TASK-029)**

During sync, the final output showed:
```
Sync complete!                                                                  one
```

The "one" is remnant text from the progress bar not being fully cleared. Likely caused by:
- Terminal width differences
- Incomplete clearing with `\r` and space padding
- Race condition between progress updates

**Fix:** Ensure progress line is fully cleared before printing "Sync complete!" - consider using ANSI escape codes for proper line clearing instead of space padding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sync complete message displays cleanly
- [ ] #2 No remnant text from progress bar
<!-- AC:END -->
