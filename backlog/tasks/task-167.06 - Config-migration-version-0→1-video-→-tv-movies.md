---
id: TASK-167.06
title: 'Config migration: version 0→1 (video → tv + movies)'
status: To Do
assignee: []
created_date: '2026-03-19 14:48'
labels:
  - config
  - video
milestone: Video Collection Split
dependencies:
  - TASK-167.01
  - TASK-166.03
references:
  - doc-007
  - doc-006
documentation:
  - packages/podkit-core/src/video/directory-adapter.ts
parent_task_id: TASK-167
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first real migration in the config migration wizard system. Converts `[video.*]` config sections to `[tv.*]` and/or `[movies.*]`. See PRD: doc-007.

This is an interactive migration using the context-aware wizard infrastructure from TASK-166.03.

**Migration behaviour:**
- Detects `[video.*]` sections in the raw TOML
- For each video collection:
  - Scans the directory using `VideoDirectoryAdapter` with no filter to detect all content
  - Reports what was found (e.g., "Found 26 TV episodes and 3 movies in /media/videos")
  - Asks the user how to configure: create `[tv.*]`, `[movies.*]`, or both pointing at the same path
- Rewrites `[video.*]` sections as the chosen `[tv.*]` and/or `[movies.*]` sections
- Updates `defaults.video` → `defaults.tv` / `defaults.movies`
- Updates device-level `videoQuality` references if applicable
- Bumps config version from 0 to 1

**User stories covered:** Transition path for all existing users

**Note:** This is the migration that proves the entire migration wizard system works end-to-end with real user data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Migration detects [video.*] sections in raw TOML
- [ ] #2 Migration scans each video directory and reports detected content types
- [ ] #3 User is prompted for how to split each collection (tv, movies, or both)
- [ ] #4 User can abort at any point without config modification
- [ ] #5 [video.*] sections rewritten as [tv.*] and/or [movies.*] based on user decisions
- [ ] #6 defaults.video updated to defaults.tv / defaults.movies
- [ ] #7 Device-level videoQuality references preserved correctly
- [ ] #8 Config version bumped from 0 to 1
- [ ] #9 Integration test: version 0 config with [video.default] migrates to version 1 with correct [tv.*]/[movies.*] sections
- [ ] #10 `podkit migrate` on an existing real config produces a valid, loadable config
<!-- AC:END -->
