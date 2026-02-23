---
id: TASK-040.03
title: Implement artwork management APIs
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - artwork
dependencies: []
parent_task_id: TASK-040
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose additional libgpod artwork APIs:

- `itdb_track_remove_thumbnails(track)` - Remove artwork from track
- `itdb_track_has_thumbnails(track)` - Check if track has artwork
- `itdb_track_set_thumbnails_from_data(track, data, len)` - Set artwork from raw bytes
- `itdb_track_get_thumbnail(track, type)` - Get artwork as image data
- `itdb_device_get_cover_art_formats(device)` - Get supported artwork formats
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 removeTrackArtwork(trackId) method removes artwork
- [ ] #2 hasTrackArtwork(trackId) returns boolean
- [ ] #3 setTrackArtworkFromData(trackId, buffer) accepts Buffer
- [ ] #4 getArtworkFormats() returns supported formats for device
- [ ] #5 Integration tests verify artwork operations
<!-- AC:END -->
