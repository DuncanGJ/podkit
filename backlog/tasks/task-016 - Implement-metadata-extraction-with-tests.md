---
id: TASK-016
title: Implement metadata extraction with tests
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-015
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement robust metadata extraction from audio files.

**Metadata fields to extract:**
- Core: title, artist, album, albumArtist
- Track info: trackNumber, discNumber, year, genre
- Technical: duration, bitrate, sampleRate
- Identifiers: MusicBrainz IDs (if present)

**Testing requirements:**
- Unit tests for each metadata field
- Test files with complete metadata
- Test files with partial/missing metadata
- Test files with unicode/special characters in tags
- Test various formats: FLAC, MP3 (ID3v2.3, ID3v2.4), M4A, OGG

**Test fixtures:**
- Create or source small test audio files with known metadata
- Document test fixture creation process
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All metadata fields extracted correctly
- [ ] #2 Unit tests for each field
- [ ] #3 Tests for partial/missing metadata
- [ ] #4 Tests for unicode and special characters
- [ ] #5 Tests for multiple audio formats
- [ ] #6 Test fixtures documented
<!-- AC:END -->
