---
id: TASK-186
title: Unify sync pipeline with Content Type Handler pattern
status: Done
assignee: []
created_date: '2026-03-21 23:18'
updated_date: '2026-03-22 12:02'
labels:
  - refactor
  - architecture
dependencies: []
references:
  - packages/podkit-core/src/sync/types.ts
  - packages/podkit-core/src/sync/differ.ts
  - packages/podkit-core/src/sync/video-differ.ts
  - packages/podkit-core/src/sync/planner.ts
  - packages/podkit-core/src/sync/video-planner.ts
  - packages/podkit-core/src/sync/executor.ts
  - packages/podkit-core/src/sync/video-executor.ts
  - packages/podkit-core/src/adapters/interface.ts
  - packages/podkit-core/src/video/directory-adapter.ts
  - packages/podkit-cli/src/commands/sync.ts
documentation:
  - doc-010
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The sync pipeline has parallel implementations for music and video at every stage (differ, planner, executor), with ~20 duplicate type pairs (SyncDiff/VideoSyncDiff, SyncPlan/VideoSyncPlan, ExecuteResult/VideoExecuteResult, etc.). Adding a new content type requires duplicating all of this, and developers frequently forget to update one branch when making changes.

This initiative introduces a generic `ContentTypeHandler<TSource, TDevice>` interface that each media type implements, and refactors the pipeline into a shared orchestration layer that delegates type-specific decisions to the handler. This enables adding new content types by implementing a single handler rather than duplicating the entire pipeline.

The migration is incremental: first unify types, then upgrade video to feature parity, then define the handler interface, then unify each pipeline stage one at a time.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A single ContentTypeHandler<TSource, TDevice> interface exists and is implemented by MusicHandler and VideoHandler
- [ ] #2 The differ, planner, and executor each have a single generic implementation that delegates to handlers
- [ ] #3 Adding a new content type requires only: implementing ContentTypeHandler, a CollectionAdapter, and entity types — no pipeline duplication
- [ ] #4 All existing music and video tests pass without behavioral changes
- [ ] #5 Video sync has feature parity with music: retries, error categorization, and self-healing upgrades
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Completion Status (2026-03-22)

Subtasks 186.01–186.08 completed the initial migration. A follow-up session completed the remaining work:

### Deprecated code removal (186.09 prerequisite work, done):
- Removed all deprecated wrapper classes: DefaultSyncDiffer, DefaultSyncPlanner, DefaultVideoSyncDiffer, DefaultVideoSyncPlanner
- Removed deprecated factories: createDiffer, createPlanner, createVideoDiffer, createVideoPlanner, createExecutor, createVideoExecutor, executePlan
- Removed deprecated type aliases: VideoExecutorProgress, VideoExecuteResult, SyncDiffer, SyncPlanner interfaces
- Removed dead syncVideoCollection() function (~320 lines)
- Implemented MusicHandler.executeBatch() wrapping DefaultSyncExecutor
- Wired both music and video execution through UnifiedExecutor in the CLI
- Internalized DefaultSyncExecutor and DefaultVideoSyncExecutor (un-exported, marked @internal)
- All tests pass (1862 core, 58 CLI), build succeeds

### Remaining subtasks:
- **186.09** (High): Restore video transcode progress bar — lost during UnifiedExecutor migration (3-layer fix needed)
- **186.10** (Medium): Update demo mock to match new public API — stale exports of removed classes
- **186.11** (Low): Migrate music diff/plan to UnifiedDiffer/UnifiedPlanner — architectural consistency, not a bug
<!-- SECTION:NOTES:END -->
