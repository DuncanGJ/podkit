---
id: TASK-186.14
title: Remove "Unified" prefix and add "Music" prefix for naming symmetry
status: To Do
assignee: []
created_date: '2026-03-22 12:51'
labels:
  - refactor
  - architecture
  - naming
dependencies:
  - TASK-186.12
references:
  - packages/podkit-core/src/sync/differ.ts
  - packages/podkit-core/src/sync/planner.ts
  - packages/podkit-core/src/sync/executor.ts
  - packages/podkit-core/src/sync/unified-differ.ts
  - packages/podkit-core/src/sync/unified-planner.ts
  - packages/podkit-core/src/sync/unified-executor.ts
  - packages/podkit-core/src/sync/types.ts
  - packages/podkit-core/src/index.ts
  - packages/podkit-cli/src/commands/sync.ts
  - packages/demo/src/mock-core.ts
parent_task_id: TASK-186
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Goal

Make music and video first-class concepts in the codebase by:
1. Adding "Music" prefixes to music-specific symbols that currently use generic names (e.g., `SyncDiff` → `MusicSyncDiff`)
2. Removing the "Unified" prefix from generic pipeline components (e.g., `UnifiedDiffer` → `SyncDiffer`)
3. Cleaning up dead video pipeline code that's no longer referenced
4. Consolidating duplicate utility functions where the handler pattern makes them redundant

## Background

The codebase was originally music-only. When video was added, video-specific code got `Video` prefixes while music code kept unprefixed generic names. TASK-186 then added `Unified` prefixes to avoid collisions. The result is three naming conventions coexisting:

- Generic names that are actually music-specific: `SyncDiff`, `computeDiff`, `DefaultSyncExecutor`
- Video-prefixed names: `VideoSyncDiff`, `diffVideos`, `VideoHandler`
- Unified-prefixed generic pipeline: `UnifiedDiffer`, `UnifiedPlanner`, `UnifiedExecutor`

## Execution plan

### Phase 1a: Rename music files
- `differ.ts` → `music-differ.ts` (and test files)
- `planner.ts` → `music-planner.ts` (and test files)
- `executor.ts` → `music-executor.ts` (and test files)

### Phase 1b: Add "Music" prefix to music-specific symbols
| Old | New |
|-----|-----|
| `SyncDiff` | `MusicSyncDiff` |
| `SyncDiffer` | `MusicSyncDiffer` |
| `SyncPlanner` | `MusicSyncPlanner` |
| `SyncExecutor` | `MusicSyncExecutor` |
| `DiffOptions` | `MusicDiffOptions` |
| `PlanOptions` | `MusicPlanOptions` |
| `ExecuteOptions` | `MusicExecuteOptions` |
| `computeDiff()` | `computeMusicDiff()` |
| `createPlan()` | `createMusicPlan()` |
| `DefaultSyncExecutor` | `MusicExecutor` (or `DefaultMusicExecutor`) |
| `createExecutor()` | `createMusicExecutor()` |
| `executePlan()` | `executeMusicPlan()` |
| `getOperationDisplayName()` | `getMusicOperationDisplayName()` |
| `calculateOperationSize()` | `calculateMusicOperationSize()` |
| `getPlanSummary()` | `getMusicPlanSummary()` |
| `willFitInSpace()` | `willMusicFitInSpace()` |
| `DEFAULT_RETRY_CONFIG` | `MUSIC_RETRY_CONFIG` |

### Phase 1c: Remove dead video pipeline code
- Delete `syncVideoCollection()` and `VideoSyncContext` from CLI sync.ts (replaced by `syncCollection()`)
- Delete `PlaceholderVideoSyncExecutor` and `createVideoExecutor()` from video-executor.ts
- Clean up old video factory functions that return placeholders
- Update the one test that still references `syncVideoCollection`

### Phase 2a: Rename unified files
- `unified-differ.ts` → `differ.ts` (now free after Phase 1a)
- `unified-planner.ts` → `planner.ts`
- `unified-executor.ts` → `executor.ts`

### Phase 2b: Remove "Unified" prefix from generic symbols
| Old | New |
|-----|-----|
| `UnifiedSyncDiff` | `SyncDiff` |
| `UnifiedDiffOptions` | `DiffOptions` |
| `UnifiedDiffer` | `SyncDiffer` |
| `createUnifiedDiffer` | `createDiffer` |
| `UnifiedPlanOptions` | `PlanOptions` |
| `UnifiedPlanner` | `SyncPlanner` |
| `createUnifiedPlanner` | `createPlanner` |
| `UnifiedExecuteOptions` | `ExecuteOptions` |
| `UnifiedExecutor` | `SyncExecutor` |
| `createUnifiedExecutor` | `createExecutor` |
| `UnifiedSyncContext` (CLI) | `SyncContext` |
| `UnifiedSyncResult` (CLI) | `SyncResult` |

### Phase 2c: Update demo mock and exports
- Update all renamed symbols in `mock-core.ts`
- Update all re-exports in `index.ts`

## DRY opportunities to address
- Parallel display name functions (`getOperationDisplayName` vs `getVideoOperationDisplayName`) — make handler-internal once music also uses unified pipeline
- Parallel size/time estimation — already encapsulated by handler methods
- Duplicate error handling between `executor.ts` and `error-handling.ts` — consolidate once music uses unified executor

## Files affected (~25)
- `packages/podkit-core/src/sync/` — all differ/planner/executor files and tests
- `packages/podkit-core/src/sync/types.ts`
- `packages/podkit-core/src/sync/handlers/music-handler.ts`
- `packages/podkit-core/src/index.ts`
- `packages/podkit-cli/src/commands/sync.ts` and test files
- `packages/demo/src/mock-core.ts`

## Interaction with other tasks
- **TASK-186.12** (migrate music executor) should complete first — it deletes `DefaultSyncExecutor` and `syncMusicCollection`, reducing the number of symbols that need "Music" prefixes
- **TASK-186.13** (migrate music differ/planner) is related but not a hard dependency — the underlying functions (`computeMusicDiff`, `createMusicPlan`) will still exist as handler internals regardless
- If 186.12 completes first, Phase 1b has fewer symbols to rename and Phase 1c may already be partially done
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Music-specific files renamed: differ.ts → music-differ.ts, planner.ts → music-planner.ts, executor.ts → music-executor.ts
- [ ] #2 All music-specific symbols have explicit Music prefix — no generic names for music-only code
- [ ] #3 Dead video pipeline code removed: syncVideoCollection(), PlaceholderVideoSyncExecutor, old video factory functions
- [ ] #4 Unified files renamed: unified-differ.ts → differ.ts, unified-planner.ts → planner.ts, unified-executor.ts → executor.ts
- [ ] #5 All "Unified" prefixes removed from generic pipeline symbols (SyncDiffer, SyncPlanner, SyncExecutor, etc.)
- [ ] #6 Demo mock updated to match all renamed exports
- [ ] #7 All tests pass — build clean, core tests, CLI tests, E2E tests
- [ ] #8 Duplicate utility functions identified and consolidated where handler pattern makes them redundant
<!-- AC:END -->
