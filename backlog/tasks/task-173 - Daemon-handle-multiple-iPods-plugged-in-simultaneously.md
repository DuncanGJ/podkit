---
id: TASK-173
title: 'Daemon: handle multiple iPods plugged in simultaneously'
status: To Do
assignee: []
created_date: '2026-03-19 22:24'
labels:
  - daemon
  - docker
milestone: 'M3: Production Ready (v1.0.0)'
dependencies: []
references:
  - packages/podkit-daemon/src/sync-orchestrator.ts
  - packages/podkit-daemon/src/device-poller.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The daemon mounts detected iPods to a fixed `/ipod` path inside the container. If two iPods are plugged in at the same time (or one is plugged in while another is syncing), the second mount will fail because `/ipod` is already in use.

### Current behavior (untested, likely broken)

1. iPod A detected → mounted at `/ipod` → sync starts
2. iPod B detected while sync is running → tries to mount at `/ipod` → fails (busy) or overwrites
3. Unclear error handling — could corrupt iPod A's sync or silently skip iPod B

### Expected behavior

The daemon should handle multiple iPods gracefully:
- Use unique mount points per device (e.g., `/tmp/podkit-<label>` or `/tmp/podkit-<partition>`)
- Queue or serialize syncs if needed — don't try to sync two devices simultaneously
- If a second iPod appears during a sync, queue it and sync after the first completes
- Log clearly which device is being synced

### Discovery

Found during Synology NAS validation (TASK-165). The daemon was tested with a single iPod only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Daemon uses unique mount points per device (not a fixed /ipod path)
- [ ] #2 Second iPod plugged in during a sync is queued and synced after the first completes
- [ ] #3 Logs clearly identify which device is being synced by label/partition name
- [ ] #4 No data corruption risk from concurrent mount attempts
<!-- AC:END -->
