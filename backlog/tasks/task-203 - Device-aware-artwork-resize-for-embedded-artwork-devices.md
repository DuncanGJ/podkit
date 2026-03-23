---
id: TASK-203
title: Device-aware artwork resize for embedded-artwork devices
status: To Do
assignee: []
created_date: '2026-03-23 14:09'
labels:
  - feature
  - core
  - transcoding
milestone: '"Additional Device Support: Echo Mini"'
dependencies: []
references:
  - packages/podkit-core/src/transcode/ffmpeg.ts
  - packages/podkit-core/src/sync/music-planner.ts
  - packages/podkit-core/src/sync/music-executor.ts
documentation:
  - backlog/docs/doc-012 - Spec--Transfer-Mode-Behavior-Matrix.md
  - backlog/docs/doc-013 - Spec--Device-Capabilities-Interface.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement artwork resizing during transcode and optimized-copy operations for devices that read artwork from embedded file data. On these devices, embedded artwork is functional (unlike iPods which use a database), so `optimized` mode should resize to the device's max resolution rather than strip entirely.

**PRD:** DOC-011 (Transfer Mode)
**Spec:** DOC-012 (Behavior Matrix — Embedded Artwork Devices section)
**Spec:** DOC-013 (Device Capabilities Interface — artworkSources and artworkMaxResolution)

**Behavior for embedded-artwork devices:**
- `fast`: resize embedded artwork to `artworkMaxResolution` (keep the device happy, avoid chug)
- `optimized`: resize embedded artwork to `artworkMaxResolution` (save space, maintain function)
- `portable`: preserve full-res embedded artwork (inform user that device will only display at its max resolution)

**Key difference from iPod (database artwork):**
- iPod: embedded artwork is dead weight → strip in fast/optimized
- Embedded device: embedded artwork is the only artwork source → never strip, only resize

**Implementation:**
- The sync engine queries `DeviceCapabilities.artworkSources` — if primary source is `'embedded'`, use resize logic instead of strip logic
- FFmpeg can resize during transcode/optimized-copy with filter flags (e.g., `-vf scale=320:320`)
- `artworkMaxResolution` from DeviceCapabilities determines target size
- Do NOT upscale — if source artwork is smaller than device max, use as-is

**Info message for portable mode:**
When user selects `portable` on an embedded-only device, inform them that artwork will be full-res in the file but the device only displays at its max resolution. No action needed — just transparency.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Planner checks artworkSources to determine strip vs resize behavior for artwork
- [ ] #2 FFmpeg args include artwork resize filter when device primary artwork source is 'embedded'
- [ ] #3 artworkMaxResolution from DeviceCapabilities used as resize target
- [ ] #4 Artwork is not upscaled when source is smaller than device max resolution
- [ ] #5 Resize applies during both transcode and optimized-copy operations
- [ ] #6 Portable mode on embedded-artwork device preserves full-res artwork with informational message
- [ ] #7 Tests cover resize vs strip decision based on artworkSources
<!-- AC:END -->
