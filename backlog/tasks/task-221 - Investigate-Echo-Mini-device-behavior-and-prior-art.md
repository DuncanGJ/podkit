---
id: TASK-221
title: Investigate Echo Mini device behavior and prior art
status: To Do
assignee: []
created_date: '2026-03-23 20:24'
labels:
  - research
  - device
milestone: m-14
dependencies: []
references:
  - devices/echo-mini.md
documentation:
  - backlog/docs/doc-020 - Architecture--Multi-Device-Support-Decisions.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Physical investigation of the FiiO Echo Mini and review of existing open-source Echo Mini music managers. This is a prerequisite for building the MassStorageAdapter (TASK-206).

**Hands-on device inspection:**
Plug in the Echo Mini and document:
1. USB vendor/product ID — is it distinct enough to auto-detect? (Profile has VID `0x0b98`, PID TBD)
2. Filesystem structure — what does the directory layout look like with music loaded? Any conventions (Artist/Album/track)?
3. Hidden directories or metadata files — does the device create any index, cache, or database files?
4. Sidecar artwork — what format? (`cover.jpg`, `folder.jpg`, something else?) What resolution does it actually render?
5. How it reads metadata — pure ID3/Vorbis tags? Does it build a cache on first scan?
6. Playlist support — what format? (m3u, m3u8, other?) Where are playlists stored?

**Review existing open-source managers:**
Find and review GitHub projects for Echo Mini music management. Document:
- File naming conventions used
- Sidecar artwork format and naming
- Any device quirks or limitations discovered
- How they handle metadata and folder structure

**Output:** Update the device profile (`devices/echo-mini.md`) with findings from both investigation tracks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 USB vendor/product ID documented (confirm or rule out auto-detection feasibility)
- [ ] #2 Filesystem structure documented with example directory layout
- [ ] #3 Sidecar artwork format, naming, and resolution documented
- [ ] #4 Metadata reading behavior documented (tags, caching, indexing)
- [ ] #5 Playlist format and location documented
- [ ] #6 At least one existing open-source Echo Mini manager reviewed with findings noted
- [ ] #7 devices/echo-mini.md updated with all findings
<!-- AC:END -->
