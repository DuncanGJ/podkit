---
id: TASK-139
title: Design and implement playlist support in podkit CLI
status: To Do
assignee: []
created_date: '2026-03-16 13:02'
labels:
  - cli
  - feature
  - design
dependencies: []
references:
  - >-
    packages/podkit-core/src/ipod/database.ts (lines 666-843 - existing playlist
    API)
  - packages/podkit-core/src/ipod/playlist.ts (IpodPlaylistImpl)
  - packages/libgpod-node/native/playlist_operations.cc (low-level bindings)
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
podkit currently has no CLI commands or sync-level support for reading or managing playlists on the iPod. The low-level libgpod-node bindings for playlist CRUD exist (TASK-040.02, TASK-046), and the IpodDatabase abstraction layer exposes playlist operations, but nothing in the CLI or sync flow uses them.

This task is to research and design how playlists should be exposed to users, including:
- Reading/listing playlists on the device (`podkit device playlists` or similar)
- Creating, renaming, and deleting playlists
- Adding/removing tracks from playlists
- How playlists interact with sync (should sync manage playlists? preserve user-created ones?)
- Whether playlist definitions should be part of collection config

This is a prerequisite for any feature that needs to manage playlists during sync (e.g., video playlist management).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ADR written covering playlist management design decisions
- [ ] #2 CLI commands for listing playlists on device
- [ ] #3 CLI commands for basic playlist CRUD (create, rename, delete)
- [ ] #4 Playlist support integrated with or considered alongside sync workflow
<!-- AC:END -->
