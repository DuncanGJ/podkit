---
id: TASK-023
title: Implement embedded artwork extraction
status: To Do
assignee: []
created_date: '2026-02-22 19:38'
labels: []
milestone: 'M3: Production Ready (v1.0.0)'
dependencies:
  - TASK-015
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract embedded album artwork from audio files.

**Implementation:**
- Extract artwork from FLAC, MP3, M4A files
- Support common image formats (JPEG, PNG)
- Handle files with no embedded artwork gracefully

**Testing requirements:**
- Test extraction from each audio format
- Test JPEG and PNG artwork
- Test files without artwork
- Test files with multiple embedded images (use first/largest)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Extracts artwork from FLAC, MP3, M4A
- [ ] #2 Handles JPEG and PNG formats
- [ ] #3 Gracefully handles missing artwork
- [ ] #4 Unit tests for extraction
<!-- AC:END -->
