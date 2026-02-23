---
id: TASK-040.01
title: Re-implement getUniqueArtworkIds
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - artwork
dependencies: []
parent_task_id: TASK-040
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Re-add the `getUniqueArtworkIds()` method that was previously implemented but deleted. This method collects unique `mhii_link` values from tracks for artwork deduplication purposes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 getUniqueArtworkIds() method exposed on Database class
- [ ] #2 Returns array of unique mhii_link values from all tracks
- [ ] #3 Integration test verifies deduplication behavior
<!-- AC:END -->
