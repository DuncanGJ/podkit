---
id: TASK-010
title: Implement write track to iPod functionality
status: To Do
assignee: []
created_date: '2026-02-22 19:09'
labels: []
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-009
references:
  - docs/LIBGPOD.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add functionality to write a single track to iPod.

**Implementation:**
- Create new Itdb_Track with metadata
- Add track to database (itdb_track_add)
- Copy audio file to iPod storage (itdb_cp_track_to_ipod)
- Write database changes (itdb_write)

**Considerations:**
- File must be in iPod-compatible format (MP3, AAC) - transcoding is M2
- Metadata must be set before adding
- Handle errors gracefully (disk full, write protected, etc.)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Can add a new track to iPod database
- [ ] #2 Audio file copied to correct iPod location
- [ ] #3 Database written successfully
- [ ] #4 Metadata preserved on track
- [ ] #5 Error handling for common failure cases
- [ ] #6 Unit tests for track writing
<!-- AC:END -->
