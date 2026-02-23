---
id: TASK-040.07
title: Implement smart playlist APIs
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - playlists
  - smart-playlists
dependencies: []
parent_task_id: TASK-040
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose libgpod smart playlist (SPL) APIs:

- `itdb_splr_*` functions for smart playlist rules
- SPL field matching and conditions
- Rule creation and modification

Smart playlists use query-based filtering rather than explicit track lists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Can create smart playlists with rules
- [ ] #2 Can define match conditions (artist, genre, rating, etc.)
- [ ] #3 Smart playlist tracks auto-populate based on rules
<!-- AC:END -->
