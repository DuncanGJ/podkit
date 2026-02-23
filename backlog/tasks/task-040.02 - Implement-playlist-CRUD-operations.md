---
id: TASK-040.02
title: Implement playlist CRUD operations
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - playlists
dependencies: []
parent_task_id: TASK-040
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose libgpod playlist management APIs:

**Create/Delete:**
- `itdb_playlist_new(title, spl)` - Create new playlist
- `itdb_playlist_add(itdb, playlist, pos)` - Add playlist to database
- `itdb_playlist_remove(playlist)` - Remove playlist from database
- `itdb_playlist_duplicate(playlist)` - Duplicate playlist

**Track management:**
- `itdb_playlist_add_track(playlist, track, pos)` - Add track to playlist
- `itdb_playlist_remove_track(playlist, track)` - Remove track from playlist
- `itdb_playlist_contains_track(playlist, track)` - Check membership

**Lookup:**
- `itdb_playlist_by_id(itdb, id)` - Find playlist by ID
- `itdb_playlist_by_name(itdb, name)` - Find playlist by name

**Utilities:**
- `itdb_playlist_is_mpl(playlist)` - Check if master playlist
- `itdb_playlist_is_podcasts(playlist)` - Check if podcasts playlist
- `itdb_playlist_set_name(playlist, name)` - Rename playlist
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Can create new playlists via createPlaylist(name)
- [ ] #2 Can add/remove tracks from playlists
- [ ] #3 Can delete playlists
- [ ] #4 Can rename playlists
- [ ] #5 Can find playlists by ID and name
- [ ] #6 Integration tests for playlist CRUD operations
<!-- AC:END -->
