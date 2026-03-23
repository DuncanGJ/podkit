---
id: TASK-225
title: CLI multi-device support for device commands
status: To Do
assignee: []
created_date: '2026-03-23 20:31'
updated_date: '2026-03-23 20:31'
labels:
  - feature
  - cli
milestone: m-14
dependencies:
  - TASK-222
  - TASK-223
  - TASK-224
references:
  - packages/podkit-cli/src/commands/device.ts
  - packages/podkit-cli/src/device-resolver.ts
documentation:
  - backlog/docs/doc-020 - Architecture--Multi-Device-Support-Decisions.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update CLI device commands to work with non-iPod devices. Currently `device scan`, `device info`, and `device music` assume iPod-specific behavior (libgpod database, iPod_Control directory, generation metadata).

**Commands to update:**

**`podkit device scan`** — Currently scans for iPods only. Should also find configured non-iPod devices and show their status (connected/disconnected, device type, name).

**`podkit device info`** — Currently shows iPod-specific info (generation, firmware, database stats). Should show device-appropriate info:
- Mass-storage: device type, mount point, capacity, file count, capabilities
- iPod: existing behavior unchanged

**`podkit device music`** — Currently reads from iTunesDB. Should read from MassStorageAdapter's track scan for non-iPod devices. Output format (table/JSON) stays the same.

**Commands that may need gating:**
- `podkit device init` / `podkit device reset` — iPod-only (iTunesDB operations). Should show a clear error if run against a mass-storage device, or be hidden for non-iPod devices.
- `podkit doctor` — diagnostics are device-specific. Should route to the correct diagnostic checks based on device type.

**New command:**
- `podkit device setup` — the wizard flow from config/detection task. May be created as part of that task instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 podkit device scan shows both iPod and non-iPod configured devices
- [ ] #2 podkit device info displays device-appropriate information for mass-storage devices
- [ ] #3 podkit device music reads tracks from MassStorageAdapter for non-iPod devices
- [ ] #4 iPod-only commands (init, reset) show clear error when run against mass-storage device
- [ ] #5 podkit doctor routes to device-appropriate diagnostic checks
- [ ] #6 Existing iPod CLI behavior unchanged
<!-- AC:END -->
