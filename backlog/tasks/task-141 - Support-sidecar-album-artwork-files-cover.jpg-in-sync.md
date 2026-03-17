---
id: TASK-141
title: Support sidecar album artwork files (cover.jpg) in sync
status: To Do
assignee: []
created_date: '2026-03-16 21:12'
labels:
  - enhancement
  - artwork
  - subsonic
  - directory-adapter
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

podkit currently only handles **embedded** artwork (images stored inside audio files). It does not support **sidecar** artwork files like `cover.jpg`, `folder.jpg`, etc. that sit alongside audio files in a directory.

This causes two issues:

### Directory adapter
When a directory has a `cover.jpg` but audio files have no embedded artwork, the directory adapter correctly reports `hasArtwork: false` (it only checks embedded images). However, users expect sidecar artwork to be transferred to the iPod. This is a missing feature.

### Subsonic adapter
Navidrome (and other Subsonic servers) pick up sidecar `cover.jpg` files as album-level artwork. The Subsonic API's `coverArt` field is an opaque ID that points to whatever artwork the server has — it does not distinguish between embedded and external artwork. Our adapter sets `hasArtwork = song.coverArt !== undefined && song.coverArt !== ''`, which reports `true` even when the audio file has no embedded image.

This causes an **infinite loop bug**: `artwork-added` fires because `source.hasArtwork === true && ipod.hasArtwork === false`, but the executor extracts artwork from the downloaded audio file (which has none), so the iPod track stays without artwork. Next sync → same mismatch → same upgrade → never resolves.

### Current workaround
The `artwork-added` detection only triggers based on `hasArtwork` presence flags. For now, we treat this as an unsupported scenario — sidecar artwork is not handled.

## Scope

1. **Directory adapter**: Add support for detecting and extracting sidecar artwork files (cover.jpg, folder.jpg, cover.png, folder.png) when no embedded artwork exists
2. **Subsonic adapter**: When `coverArt` is set but the downloaded audio file has no embedded artwork, fetch artwork via `getCoverArt` endpoint and transfer it to the iPod
3. **Artwork extractor**: Add a fallback that checks for sidecar files in the same directory as the audio file
4. **Documentation**: Document supported artwork sources (embedded, sidecar, server-provided)

## References
- Subsonic API spec: `coverArt` is album-level, not per-track embedded artwork
- Navidrome picks up cover.jpg/folder.jpg as album artwork automatically
- `packages/podkit-core/src/adapters/subsonic.ts` line 294: `hasArtwork` determination
- `packages/podkit-core/src/artwork/extractor.ts`: currently only handles embedded artwork
- `test/fixtures/audio/multi-format/cover.jpg`: example of sidecar artwork that causes the infinite loop
<!-- SECTION:DESCRIPTION:END -->
