---
id: TASK-040.06
title: Implement database creation APIs
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - database
dependencies: []
parent_task_id: TASK-040
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose libgpod database creation/manipulation APIs:

- `itdb_new()` - Create empty database (not from existing mount)
- `itdb_parse_file(filename)` - Parse from specific file path
- `itdb_duplicate(itdb)` - Duplicate entire database
- `itdb_set_mountpoint(itdb, mountpoint)` - Change mountpoint

These would enable creating new iPod databases programmatically rather than only reading existing ones.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Database.create() creates new empty database
- [ ] #2 Database.openFile(path) opens from specific file
- [ ] #3 database.duplicate() creates a copy
- [ ] #4 Integration tests for database creation
<!-- AC:END -->
