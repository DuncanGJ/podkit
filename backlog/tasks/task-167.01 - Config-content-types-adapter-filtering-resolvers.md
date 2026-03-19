---
id: TASK-167.01
title: Config + content types + adapter filtering + resolvers
status: To Do
assignee: []
created_date: '2026-03-19 14:46'
labels:
  - config
  - core
milestone: Video Collection Split
dependencies:
  - TASK-166
references:
  - doc-007
documentation:
  - packages/podkit-cli/src/config/types.ts
  - packages/podkit-cli/src/config/loader.ts
  - packages/podkit-core/src/ipod/constants.ts
  - packages/podkit-core/src/video/directory-adapter.ts
  - packages/podkit-cli/src/resolvers/collection.ts
parent_task_id: TASK-167
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Foundation slice for the video collection split. See PRD: doc-007.

Adds `[tv.*]` and `[movies.*]` config sections (replacing `[video.*]`), expands `ContentType` from `'music' | 'video'` to `'music' | 'tv' | 'movies'`, adds content type filter to `VideoDirectoryAdapter`, and creates new collection resolver functions. No CLI commands yet — just the plumbing.

**Config changes:**
- Parse `[tv.*]` and `[movies.*]` top-level TOML sections
- `defaults.tv` and `defaults.movies` replace `defaults.video`
- `tvQuality` and `movieQuality` fields on global config and per-device config
- Quality cascade resolution: `quality` → `videoQuality` → `tvQuality`/`movieQuality`
- `'video'` is no longer a valid config-level content type

**Adapter filtering:**
- `VideoDirectoryAdapter` gains a content type filter: `'tv'`, `'movies'`, or `undefined`
- Scans all files, partitions by detected contentType, filters to requested type
- Warns about content that doesn't match (e.g., "Found 3 movies that won't be synced")

**Resolvers:**
- `resolveTvCollection()` and `resolveMoviesCollection()`
- `findCollectionByName()` searches music, tv, and movies namespaces
- `getAllCollections()` returns all three types

**User stories covered:** 10, 11, 26, 27
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 [tv.*] and [movies.*] TOML sections parse correctly
- [ ] #2 [video.*] sections are rejected with a clear error
- [ ] #3 ContentType is 'music' | 'tv' | 'movies'
- [ ] #4 Quality cascade resolves correctly: quality → videoQuality → tvQuality/movieQuality at global and device levels
- [ ] #5 VideoDirectoryAdapter with 'tv' filter returns only TV shows
- [ ] #6 VideoDirectoryAdapter with 'movies' filter returns only movies
- [ ] #7 Adapter emits warnings about mismatched content with actionable message
- [ ] #8 Adapter with no filter returns everything (for migration wizard use)
- [ ] #9 resolveTvCollection() and resolveMoviesCollection() work by name and default
- [ ] #10 findCollectionByName() searches all three namespaces
- [ ] #11 Unit tests cover config parsing, quality cascade, adapter filtering, and resolver dispatch
<!-- AC:END -->
