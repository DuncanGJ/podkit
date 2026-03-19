---
id: TASK-167.04
title: Env vars + Docker + collection add/remove + deprecate old video commands
status: To Do
assignee: []
created_date: '2026-03-19 14:47'
labels:
  - cli
  - config
  - docker
milestone: Video Collection Split
dependencies:
  - TASK-167.02
  - TASK-167.03
references:
  - doc-007
documentation:
  - packages/podkit-cli/src/config/defaults.ts
  - docker/entrypoint.sh
  - docker/Dockerfile
  - packages/podkit-cli/src/commands/collection.ts
parent_task_id: TASK-167
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cleanup and integration slice: env vars, Docker, collection management updates, and old command deprecation. See PRD: doc-007.

**Environment variables:**
- New: `PODKIT_TV_PATH`, `PODKIT_TV_<NAME>_PATH`, `PODKIT_MOVIES_PATH`, `PODKIT_MOVIES_<NAME>_PATH`
- New: `PODKIT_TV_QUALITY`, `PODKIT_MOVIE_QUALITY`
- Removed: `PODKIT_VIDEO_PATH`, `PODKIT_VIDEO_<NAME>_PATH` (breaking — version detection messaging covers this)

**Docker:**
- Update entrypoint to handle new collection types
- Docker `init` generates config with `[tv.*]` and `[movies.*]` sections
- Update `PODKIT_COMMANDS` list in entrypoint if needed

**Collection management:**
- `collection add` supports `-t tv` and `-t movies`
- `collection remove` handles tv and movies collections

**Deprecation:**
- `collection video` replaced with clear error: "The 'video' collection type has been split into 'tv' and 'movies'. Use `podkit collection tv` or `podkit collection movies`."
- `device video` replaced with same pattern
- Old commands do not silently fail — they provide actionable guidance

**User stories covered:** 21, 28
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PODKIT_TV_PATH and PODKIT_MOVIES_PATH env vars create collections
- [ ] #2 PODKIT_TV_<NAME>_PATH pattern works for named collections
- [ ] #3 PODKIT_TV_QUALITY and PODKIT_MOVIE_QUALITY override quality
- [ ] #4 PODKIT_VIDEO_PATH is rejected with clear messaging about the change
- [ ] #5 Docker entrypoint handles tv and movies collection types
- [ ] #6 Docker init generates versioned config with tv/movies sections
- [ ] #7 `collection add -t tv` and `collection add -t movies` work correctly
- [ ] #8 `collection remove` handles tv and movies collections
- [ ] #9 `collection video` shows actionable error pointing to `collection tv` and `collection movies`
- [ ] #10 `device video` shows actionable error pointing to `device tv` and `device movies`
<!-- AC:END -->
