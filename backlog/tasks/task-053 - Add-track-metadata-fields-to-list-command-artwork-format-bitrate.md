---
id: TASK-053
title: 'Add track metadata fields to list command (artwork, format, bitrate)'
status: To Do
assignee: []
created_date: '2026-02-26 00:16'
labels:
  - cli
  - list
  - verification
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enhance `podkit list` to show additional track metadata for verification after sync.

**Current state:**
- `podkit list` shows: title, artist, album, duration
- Available fields include: albumArtist, genre, year, trackNumber, discNumber, filePath

**Needed fields:**
1. **artwork** - boolean/indicator showing if track has artwork
2. **format** - audio format (AAC, MP3, ALAC, etc.)
3. **bitrate** - audio bitrate in kbps

**Usage:**
```bash
podkit list --fields title,artist,artwork,format,bitrate
```

**Implementation notes:**
- For iPod tracks: read from iTunesDB metadata (format/bitrate stored there)
- For source tracks: may need to read from file metadata
- Artwork indicator could be ✓/✗ or "yes"/"no" for table format
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 --fields supports artwork indicator
- [ ] #2 --fields supports format (AAC, MP3, etc.)
- [ ] #3 --fields supports bitrate
- [ ] #4 Works for both iPod and source collection listing
- [ ] #5 JSON output includes these fields when requested
<!-- AC:END -->
