---
id: TASK-141
title: >-
  Improve artwork source reliability: Subsonic getCoverArt fetching and sidecar
  file support
status: To Do
assignee: []
created_date: '2026-03-16 21:12'
updated_date: '2026-03-16 23:15'
labels:
  - enhancement
  - artwork
  - subsonic
  - directory-adapter
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

podkit currently only handles **embedded** artwork (images stored inside audio files). This creates two related issues:

### Issue 1: Subsonic adapter cannot reliably detect artwork presence (HIGH PRIORITY)

The Subsonic API's `coverArt` field is always populated by Navidrome (and likely other servers), even for tracks/albums without actual artwork. We set `hasArtwork: undefined` (ADR-012) to avoid false positives from the unreliable `coverArt` ID. This means:

- **artwork-added** is never detected for Subsonic sources (requires `hasArtwork === true`)
- **artwork-removed** is never detected for Subsonic sources (requires `hasArtwork === false`)
- **artwork-updated** works correctly via hash comparison with `--check-artwork`

The fix: when the Subsonic adapter encounters a `coverArt` ID, actually **fetch** the artwork from `getCoverArt` to verify it exists and is valid. If the fetch succeeds and returns a valid image, set `hasArtwork: true`. If it fails (404, empty, placeholder), set `hasArtwork: false`.

This could reuse the existing `artworkHashCache` infrastructure (already caches per coverArt ID). When `checkArtwork` is disabled, the adapter would still need to verify artwork presence — but could do a HEAD request or a smaller fetch rather than downloading the full image.

### Issue 2: Sidecar artwork files (cover.jpg) not supported (LOWER PRIORITY)

When a directory has `cover.jpg`/`folder.jpg` alongside audio files but no embedded artwork:
- Directory adapter reports `hasArtwork: false` (only checks embedded)
- Subsonic adapter (via Navidrome) sees the sidecar file and serves it via getCoverArt
- Users expect sidecar artwork to be transferred to the iPod

### Issue 3: Executor artwork extraction from downloaded files

When the executor downloads a Subsonic track and extracts artwork, it only gets embedded artwork. If the artwork only exists as a sidecar (served by getCoverArt), extraction returns null. The executor should fall back to fetching artwork from the adapter when extraction fails.

## Implementation Plan

### Phase 1: Subsonic getCoverArt verification
1. In the Subsonic adapter's `mapSongToTrack`, fetch getCoverArt to verify artwork exists
2. Cache results per coverArt ID (extend existing artworkHashCache)
3. Set `hasArtwork: true/false` based on actual fetch result
4. This unlocks artwork-added and artwork-removed detection for Subsonic

### Phase 2: Executor adapter fallback
1. When `extractArtwork()` returns null during sync, try fetching artwork from the adapter
2. Add a method to the adapter interface: `getArtwork(track): Promise<Buffer | null>`
3. Use this for both initial sync and artwork-added upgrades

### Phase 3: Directory sidecar support (optional, lower priority)
1. Add sidecar file detection to directory adapter
2. Check for cover.jpg, folder.jpg, cover.png, folder.png in the track's directory
3. Set `hasArtwork: true` when sidecar exists

## Notes
- The test fixture `test/fixtures/audio/multi-format/generate.sh` has cover.jpg creation commented out pending this work
- ADR-012 documents the current `hasArtwork: undefined` decision for Subsonic
- The `artworkHashCache` in the Subsonic adapter already handles per-album caching

## References
- ADR-012: Artwork change detection design decisions
- `packages/podkit-core/src/adapters/subsonic.ts`: current hasArtwork logic
- `packages/podkit-core/src/artwork/extractor.ts`: embedded-only extraction
- `packages/podkit-core/src/sync/executor.ts`: artwork transfer during sync
<!-- SECTION:DESCRIPTION:END -->
