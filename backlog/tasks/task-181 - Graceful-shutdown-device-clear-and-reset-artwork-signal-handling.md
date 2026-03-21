---
id: TASK-181
title: 'Graceful shutdown: device clear and reset-artwork signal handling'
status: To Do
assignee: []
created_date: '2026-03-21 21:47'
labels:
  - graceful-shutdown
dependencies: []
references:
  - packages/podkit-cli/src/commands/device.ts
  - packages/podkit-cli/src/shutdown.ts
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add shutdown controller to `device clear` and `device reset-artwork` commands so Ctrl+C during write operations doesn't corrupt the database.

Both commands modify the iPod database:
- `device clear` removes tracks and their files, then saves
- `device reset-artwork` clears all artwork and sync tags, then saves

These are shorter operations than sync, but still benefit from signal protection — especially `device clear` on large libraries which iterates through all tracks.

**Changes:**
- Wire `createShutdownController()` into both command handlers in `packages/podkit-cli/src/commands/device.ts`
- For `device clear`: check signal between track removals, save partial progress on abort
- For `device reset-artwork`: the operation is fast (single save), so just ensure clean exit on signal
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 device clear handles Ctrl+C gracefully with partial save
- [ ] #2 device reset-artwork handles Ctrl+C gracefully
- [ ] #3 Exit code 130 on interrupt for both commands
<!-- AC:END -->
