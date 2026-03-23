---
id: TASK-205
title: Transfer mode behavior adaptation for non-database artwork devices
status: To Do
assignee: []
created_date: '2026-03-23 14:10'
labels:
  - feature
  - core
  - architecture
milestone: 'Transfer Mode: Echo Mini Support'
dependencies:
  - TASK-203
  - TASK-204
references:
  - packages/podkit-core/src/sync/music-planner.ts
  - packages/podkit-core/src/sync/music-executor.ts
documentation:
  - backlog/docs/doc-012 - Spec--Transfer-Mode-Behavior-Matrix.md
  - backlog/docs/doc-013 - Spec--Device-Capabilities-Interface.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire the planner and executor to use `DeviceCapabilities.artworkSources` to select the correct transfer mode behavior matrix. Currently the planner hardcodes iPod behavior (strip artwork = good). This task makes it dynamic based on the device's primary artwork source.

**PRD:** DOC-011 (Transfer Mode)
**Spec:** DOC-012 (all three behavior matrices)
**Spec:** DOC-013 (Device Capabilities — "How the Sync Engine Uses Capabilities")

**Current state:** The planner and executor assume `artworkSources: ['database']` — embedded artwork is dead weight, strip in fast/optimized.

**Target state:** The planner queries the device's `artworkSources[0]` (primary source) and selects the appropriate behavior:

- `'database'`: Strip embedded artwork in fast/optimized (current iPod behavior)
- `'embedded'`: Resize embedded artwork to device max in all modes, preserve full-res only in portable
- `'sidecar'`: Create sidecar in all modes, strip embedded in optimized only

This is the integration point between TASK-203 (resize logic), TASK-204 (sidecar creation), and the existing planner/executor from the iPod milestone.

**Key changes:**
- Planner receives `DeviceCapabilities` and uses `artworkSources` to decide between strip/resize/sidecar behavior
- This affects both the operation type selection and what gets passed to the executor
- `artworkMaxResolution` passed through to FFmpeg args when resize is needed
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Planner selects artwork behavior based on DeviceCapabilities.artworkSources primary source
- [ ] #2 Database-artwork devices: strip embedded in fast/optimized (existing iPod behavior preserved)
- [ ] #3 Embedded-artwork devices: resize embedded artwork, never strip
- [ ] #4 Sidecar-artwork devices: create sidecar, strip embedded only in optimized mode
- [ ] #5 artworkMaxResolution passed through to executor for resize operations
- [ ] #6 All three behavior matrices from DOC-012 are correctly implemented
- [ ] #7 Tests cover planner behavior with each artwork source type
<!-- AC:END -->
