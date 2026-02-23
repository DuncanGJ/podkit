---
id: TASK-040.09
title: Implement photo database APIs
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - photos
dependencies: []
parent_task_id: TASK-040
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose libgpod photo database APIs:

- `itdb_photodb_parse(mountpoint)` - Open photo database
- `itdb_photodb_write(photodb)` - Write photo database
- `itdb_photodb_add_photo(photodb, filename)` - Add photo
- `itdb_photodb_remove_photo(photodb, photo)` - Remove photo
- Photo album management (create, add photos, remove)

This is a separate database from the music database.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PhotoDatabase class for photo operations
- [ ] #2 Can add/remove photos
- [ ] #3 Can create/manage photo albums
- [ ] #4 Integration tests for photo sync
<!-- AC:END -->
