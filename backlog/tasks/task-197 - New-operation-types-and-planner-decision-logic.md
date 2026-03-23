---
id: TASK-197
title: New operation types and planner decision logic
status: To Do
assignee: []
created_date: '2026-03-23 14:07'
labels:
  - feature
  - core
  - sync
milestone: 'Transfer Mode: iPod Support'
dependencies:
  - TASK-195
  - TASK-196
references:
  - packages/podkit-core/src/sync/music-planner.ts
  - packages/podkit-core/src/sync/types.ts
  - packages/podkit-core/src/sync/music-differ.ts
documentation:
  - backlog/docs/doc-014 - Spec--Operation-Types-&-Sync-Tags.md
  - backlog/docs/doc-012 - Spec--Transfer-Mode-Behavior-Matrix.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the planner's overloaded `copy`/`transcode`/`upgrade` operation types with explicit, granular types that distinguish between direct-copy, optimized-copy, and transcode paths. Update planner decision logic to route based on source category + transferMode + device capabilities.

**PRD:** DOC-011 (Transfer Mode)
**Spec:** DOC-014 (Operation Types & Sync Tags)

**New operation types:**
- Add: `add-direct-copy`, `add-optimized-copy`, `add-transcode`
- Update: `upgrade-direct-copy`, `upgrade-optimized-copy`, `upgrade-transcode`
- `upgrade-artwork`, `update-metadata`, `remove` unchanged

**Planner decision flow:**
1. Categorize source (lossless / compatible-lossy / incompatible-lossy) — existing logic
2. Determine if transcode is needed (category + device codec support + quality preset) — existing logic adapted to use DeviceCapabilities
3. If transcode needed → `add-transcode` / `upgrade-transcode`
4. If copy path: check transferMode
   - `'optimized'` → `add-optimized-copy` / `upgrade-optimized-copy`
   - `'fast'` or `'portable'` → `add-direct-copy` / `upgrade-direct-copy`

**One-operation-per-track rule:**
When the differ produces multiple reasons for the same track (e.g., source-changed + artwork-updated), the planner collapses them into one operation. Priority: file replacement > artwork-only > metadata-only.

**planAddOperations changes:**
- `createCopyOperation()` → `createDirectCopyOperation()` or `createOptimizedCopyOperation()` based on transferMode
- `createTranscodeOperation()` unchanged but produces `add-transcode` type

**planUpdateOperations changes:**
- Same routing logic for upgrade variants
- `upgrade` type with optional preset → explicit `upgrade-direct-copy` / `upgrade-optimized-copy` / `upgrade-transcode`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 New operation type definitions: add-direct-copy, add-optimized-copy, add-transcode, upgrade-direct-copy, upgrade-optimized-copy, upgrade-transcode
- [ ] #2 Planner routes copy-format files to add-optimized-copy when transferMode is 'optimized'
- [ ] #3 Planner routes copy-format files to add-direct-copy when transferMode is 'fast' or 'portable'
- [ ] #4 ALAC→ALAC copy routing respects transferMode (direct-copy in fast/portable, optimized-copy in optimized)
- [ ] #5 One-operation-per-track: file replacement subsumes artwork changes for same track
- [ ] #6 planUpdateOperations produces explicit upgrade-* types instead of overloaded upgrade with optional preset
- [ ] #7 --dry-run output shows the new operation type names
- [ ] #8 Planner tests cover all transferMode × source-category combinations
<!-- AC:END -->
