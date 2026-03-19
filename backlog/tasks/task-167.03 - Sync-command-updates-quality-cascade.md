---
id: TASK-167.03
title: Sync command updates + quality cascade
status: To Do
assignee: []
created_date: '2026-03-19 14:47'
labels:
  - cli
  - video
milestone: Video Collection Split
dependencies:
  - TASK-167.01
references:
  - doc-007
documentation:
  - packages/podkit-cli/src/commands/sync.ts
  - packages/podkit-core/src/ipod/constants.ts
parent_task_id: TASK-167
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the sync command to use the new TV and Movies content types. See PRD: doc-007.

**Type flag changes:**
- `-t`/`--type` choices expand to: `music`, `tv`, `movies`, `video` (alias)
- `-t video` expands to `['tv', 'movies']` internally
- Default (no `-t` flag): sync music + tv + movies (all types with defaults)

**Collection resolution:**
- `resolveCollections()` updated to handle tv and movies as separate types
- `-c` flag searches all three namespaces

**Quality cascade wiring:**
- Sync uses the quality cascade from TASK-167.01: `--quality` → `--video-quality` → `--tv-quality` / `--movie-quality`
- CLI flags added: `--tv-quality` and `--movie-quality`
- Per-device quality overrides at each cascade level

**Filter flag:**
- `--filter` works with tv and movie collections

**User stories covered:** 6, 7, 8, 9, 22, 23, 26, 27
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `podkit sync -t tv --dry-run` syncs only TV collections
- [ ] #2 `podkit sync -t movies --dry-run` syncs only movie collections
- [ ] #3 `podkit sync -t video --dry-run` syncs both TV and movies
- [ ] #4 `podkit sync --dry-run` (no -t) syncs music + tv + movies
- [ ] #5 `podkit sync -c <name>` searches tv and movies namespaces
- [ ] #6 --tv-quality and --movie-quality CLI flags override video quality for their type
- [ ] #7 Quality cascade resolves correctly through all levels with per-device overrides
- [ ] #8 --filter works with tv and movie collections
- [ ] #9 Unit tests: video alias expansion, quality cascade resolution, collection resolution by type
<!-- AC:END -->
