---
id: TASK-079
title: Support named devices in --device argument
status: To Do
assignee: []
created_date: '2026-03-09 21:54'
labels:
  - cli
  - ux
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The `--device` / `-d` argument currently only accepts paths (e.g., `/Volumes/TERAPOD`). Users should also be able to specify a named device from config (e.g., `--device terapod`).

## Current Behavior
- `--device /Volumes/TERAPOD` works (path)
- `--device terapod` fails (tries to use "terapod" as literal path)
- Named devices exist in config with `volumeUuid` for auto-detection, but can't be referenced directly via `--device`

## Desired Behavior
- `--device terapod` resolves the named device from config
- `--device /Volumes/TERAPOD` continues to work as a path
- Applies to ALL commands that use `--device` (sync, device info, device music, device video, etc.)

## Resolution Logic
1. If value contains `/` or starts with `.` → treat as path
2. Otherwise → try named device lookup first
3. If no named device found → fall back to treating as path (for error messaging)

## Files to Modify
- `packages/podkit-cli/src/device-resolver.ts` - Main resolution logic
- Any commands that bypass the resolver and use `--device` directly
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 --device accepts named device from config (e.g., --device terapod)
- [ ] #2 --device continues to accept paths (e.g., --device /Volumes/TERAPOD)
- [ ] #3 Path-like values (containing / or starting with .) are treated as paths
- [ ] #4 Non-path values are looked up as named devices first
- [ ] #5 Clear error message when named device not found and path doesn't exist
- [ ] #6 Works for all commands: sync, device info, device music, device video
<!-- AC:END -->
