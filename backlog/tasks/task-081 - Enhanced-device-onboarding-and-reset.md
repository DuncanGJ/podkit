---
id: TASK-081
title: Enhanced device onboarding and reset
status: To Do
assignee: []
created_date: '2026-03-09 22:17'
updated_date: '2026-03-09 22:18'
labels:
  - cli
  - ipod
  - epic
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Summary

Improve the device onboarding experience so users can go from "iPod plugged in" to "ready to sync" with a single command, regardless of the device's initial state.

## Background

Currently, setting up an iPod requires multiple manual steps:
1. `podkit init` - create config
2. Manually mount iPod if not auto-mounted
3. `podkit device add <name>` - register device
4. If database missing, user is stuck (no init command works)

Users connecting an iPod should have a smooth experience whether:
- iPod is already set up with music (adopt existing library)
- iPod is blank/fresh (needs initialization)
- iPod is not auto-mounted (common with iFlash mods)
- User is adding a second device to existing setup

## Design Decisions

From design discussion:

### `device add <name> [path]`
- Auto-detect mode: `podkit device add myipod`
- Explicit path mode: `podkit device add myipod /Volumes/IPOD`
- Smart flow handles: mounting → initialization → config registration
- Multiple devices found → error with guidance to specify path

### `device reset`
- Recreates iTunesDB from scratch (not just clearing tracks)
- Preserves filesystem (volume UUID unchanged, config stays valid)
- Use case: corrupted database, fresh start, switching from iTunes

### `device clear`
- Keeps existing behavior: removes content from database
- `--type all` removes everything but keeps database structure
- Different from `reset` which recreates the database

## Sub-tasks

- TASK-081.01: Implement iPod database initialization in libgpod-node
- TASK-081.02: Enhance device add with smart onboarding flow
- TASK-081.03: Implement device reset command

## Related

- Supersedes: TASK-052, TASK-055
- Future work: DRAFT-002 (complete iPod reformat capability)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All sub-tasks completed
- [ ] #2 User can onboard any iPod state with single command flow
- [ ] #3 Reset command provides clean database recreation
- [ ] #4 E2E tests cover full user journeys
<!-- AC:END -->
