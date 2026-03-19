---
id: TASK-167
title: Video Collection Split — TV Shows & Movies
status: To Do
assignee: []
created_date: '2026-03-19 14:46'
labels:
  - config
  - cli
  - video
milestone: Video Collection Split
dependencies:
  - TASK-166
references:
  - doc-007
  - doc-006
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Parent task for splitting the video collection type into TV and Movies. See PRD: doc-007.

Replaces `[video.*]` config sections with `[tv.*]` and `[movies.*]`, adds purpose-built CLI browsing commands, quality cascade, sync updates, tab completion, and a config migration (version 0→1).

**Blocked by:** Config Migration Wizard (TASK-166) must be complete first — this is the first consumer of that system.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Config supports [tv.*] and [movies.*] sections with quality cascade
- [ ] #2 `collection tv` shows stats, supports fuzzy show drill-down, season filter, and episode list
- [ ] #3 `collection movies` shows stats, supports --list with --sort title|year
- [ ] #4 `device tv` and `device movies` mirror collection commands
- [ ] #5 Sync accepts -t tv, -t movies, -t video (alias for both)
- [ ] #6 Tab completion works for collection names and show names
- [ ] #7 Config migration 0→1 converts [video.*] to [tv.*] + [movies.*] interactively
- [ ] #8 Old `collection video` and `device video` commands show helpful error pointing to new commands
<!-- AC:END -->
