---
id: TASK-133
title: Sound Check (volume normalization) support
status: To Do
assignee: []
created_date: '2026-03-13 23:14'
labels:
  - feature
  - libgpod-node
  - sync
dependencies: []
references:
  - 'https://github.com/jvgomg/podkit/discussions/32'
documentation:
  - packages/libgpod-node/README.md
  - tools/libgpod-macos/build/libgpod-0.8.3/src/itdb.h
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Support iPod Sound Check by reading ReplayGain tags from source files and writing the `soundcheck` value to the iPod database during sync.

**Background:** iPod Sound Check normalises playback volume across tracks. The iPod firmware reads a pre-computed `soundcheck` value (a `guint32` in the iTunesDB) and applies it as a gain adjustment during playback — it does no analysis itself. The conversion from ReplayGain dB values is a well-documented formula: `soundcheck = round(1000 * 10^(gain_dB / -10))`.

**Implementation approach:**
1. Expose `soundcheck` field in libgpod-node bindings (already exists in libgpod's `Itdb_Track` struct at `itdb.h:1645`)
2. Read `REPLAYGAIN_TRACK_GAIN` (and optionally album gain) from source file metadata during sync
3. Convert to soundcheck value using the formula
4. Set the field when adding/updating tracks on the iPod

No file modification or separate audio analysis step needed — works automatically if source files have ReplayGain tags.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 libgpod-node exposes `soundcheck` field on Track and TrackInput types
- [ ] #2 During sync, if source file has REPLAYGAIN_TRACK_GAIN tag, soundcheck value is computed and set on the iPod track
- [ ] #3 iPod Sound Check toggle works correctly with podkit-synced tracks that have ReplayGain data
- [ ] #4 Tracks without ReplayGain tags sync normally (soundcheck left as 0 / no adjustment)
- [ ] #5 Integration test verifies soundcheck value is written to iPod database
<!-- AC:END -->
