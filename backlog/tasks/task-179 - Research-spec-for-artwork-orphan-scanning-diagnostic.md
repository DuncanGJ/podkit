---
id: TASK-179
title: 'Research: spec for artwork orphan scanning diagnostic'
status: To Do
assignee: []
created_date: '2026-03-21 21:42'
labels:
  - diagnostics
  - research
dependencies: []
references:
  - adr/adr-013-ipod-artwork-corruption-diagnosis-and-repair.md
  - packages/podkit-core/src/artwork/artworkdb-parser.ts
  - packages/podkit-core/src/artwork/integrity.ts
  - packages/podkit-core/src/diagnostics/checks/orphans.ts
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research and write a spec for detecting orphaned artwork files (.ithmb) on the iPod — files in `iPod_Control/Artwork/` that are not referenced by the ArtworkDB, or contain unreferenced data regions.

**Context:**
- The orphan files diagnostic (TASK-176) covers `iPod_Control/Music/F*` but not artwork
- Artwork is stored in packed binary `.ithmb` files with offsets tracked in ArtworkDB
- libgpod's `itdb_write()` compacts .ithmb files in-place during save (non-atomic, per ADR-013)
- The existing `podkit doctor --repair artwork-integrity` rebuilds artwork entirely, but doesn't detect/report wasted space from orphaned ithmb data
- Force quit during save can leave .ithmb files with unreferenced data regions

**Research questions:**
1. What does the .ithmb file format look like? How are slots allocated and referenced by ArtworkDB?
2. Can we detect unreferenced regions within an .ithmb file (wasted space inside the file)?
3. Can we detect entire .ithmb files that are unreferenced by ArtworkDB?
4. What's the typical wasted space from artwork orphans after a force-quit?
5. What would repair look like — compact the .ithmb in-place? Delete unreferenced files? Or just delegate to the existing artwork rebuild?
6. Is this worth building as a separate diagnostic, or is the existing artwork-integrity check + rebuild sufficient?

**Deliverable:** A written spec (backlog document or ADR) covering the .ithmb format analysis, detection approach, repair options, and recommendation on whether to build it.

**Key files to read:**
- `adr/adr-013-ipod-artwork-corruption-diagnosis-and-repair.md` — full corruption investigation
- `packages/podkit-core/src/artwork/artworkdb-parser.ts` — ArtworkDB parser
- `packages/podkit-core/src/artwork/integrity.ts` — existing integrity checker
- `packages/podkit-core/src/diagnostics/checks/artwork.ts` — artwork diagnostic check
- `packages/podkit-core/src/diagnostics/checks/orphans.ts` — music orphan check (pattern to follow)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Written spec covering .ithmb format and how slots are referenced
- [ ] #2 Analysis of what orphaned artwork data looks like on disk
- [ ] #3 Proposed detection approach with complexity estimate
- [ ] #4 Proposed repair approach (compact vs rebuild vs defer)
- [ ] #5 Recommendation on whether to build it as a separate diagnostic
<!-- AC:END -->
