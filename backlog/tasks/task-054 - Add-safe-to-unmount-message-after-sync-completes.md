---
id: TASK-054
title: Add safe-to-unmount message after sync completes
status: To Do
assignee: []
created_date: '2026-02-26 00:16'
labels:
  - cli
  - sync
  - ux
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After a successful sync operation, display a message informing the user it's safe to unmount/eject their iPod.

**Current behavior:**
- Sync completes with summary of tracks synced
- No guidance about ejecting

**Desired behavior:**
```
Synced 50/50 tracks successfully.
It is now safe to eject your iPod.
```

**Notes:**
- Only show on successful sync (not dry-run, not on errors)
- Keep message simple and clear
- Don't actually eject - just inform user they can
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Message displayed after successful sync
- [ ] #2 Message NOT shown on dry-run
- [ ] #3 Message NOT shown if sync had errors
<!-- AC:END -->
