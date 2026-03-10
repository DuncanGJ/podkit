---
id: TASK-030
title: Plan M4 features based on M2 decisions
status: To Do
assignee: []
created_date: '2026-02-22 19:38'
labels:
  - decision
milestone: 'M4: Extended Sources (v1.1.0)'
dependencies:
  - TASK-022
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
M4 scope depends on decisions made in M2, particularly the collection source approach.

**Potential M4 features:**
- Second collection adapter (beets or directory, whichever M2 didn't implement)
- Query/filter support for selective sync (`--filter "artist:X"`)
- Additional quality presets or custom encoder settings
- Playlist support
- Watch mode (auto-sync on iPod connection)

**This task:**
- Review M2 implementation and user feedback
- Decide which features to prioritize for M4
- Create detailed tasks

**Do not create detailed M4 tasks until M2 is substantially complete.**
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 M2 decisions reviewed
- [ ] #2 M4 priorities decided with user input
- [ ] #3 Detailed M4 tasks created
<!-- AC:END -->
