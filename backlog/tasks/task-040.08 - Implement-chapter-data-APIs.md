---
id: TASK-040.08
title: Implement chapter data APIs
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - podcasts
  - audiobooks
dependencies: []
parent_task_id: TASK-040
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose libgpod chapter data APIs for podcasts and audiobooks:

- `itdb_chapterdata_new()` - Create chapter data
- `itdb_chapterdata_add_chapter(cd, start, title)` - Add chapter marker
- `itdb_chapterdata_free(cd)` - Free chapter data
- Associate chapter data with tracks
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Can create chapter markers for tracks
- [ ] #2 Chapter data persists to iPod database
- [ ] #3 Integration tests with podcast/audiobook media types
<!-- AC:END -->
