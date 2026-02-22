---
id: TASK-009
title: Implement read iPod tracks functionality
status: To Do
assignee: []
created_date: '2026-02-22 19:09'
labels: []
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-008
references:
  - docs/LIBGPOD.md
  - docs/ARCHITECTURE.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add functionality to read track listing from iPod database.

**Implementation:**
- Iterate libgpod track list (GList)
- Convert Itdb_Track structs to TypeScript Track objects
- Handle all relevant track metadata fields
- Expose via IPodDatabase.tracks property or getTracks() method

**Track fields to extract:**
- Core: title, artist, album, albumArtist
- Info: trackNumber, discNumber, year, genre
- Technical: duration, bitrate, sampleRate, fileSize
- Path: ipod_path (file location on device)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Can read all tracks from iPod database
- [ ] #2 Track metadata correctly converted to TypeScript objects
- [ ] #3 Handles empty database gracefully
- [ ] #4 Unit tests for track reading
<!-- AC:END -->
