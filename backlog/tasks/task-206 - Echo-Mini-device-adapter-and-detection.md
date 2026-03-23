---
id: TASK-206
title: Echo Mini device adapter and detection
status: To Do
assignee: []
created_date: '2026-03-23 14:10'
labels:
  - feature
  - device
  - architecture
milestone: 'Additional Device Support: Echo Mini'
dependencies:
  - TASK-205
references:
  - devices/echo-mini.md
  - packages/podkit-core/src/device/types.ts
  - packages/podkit-core/src/device/manager.ts
documentation:
  - backlog/docs/doc-013 - Spec--Device-Capabilities-Interface.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Echo Mini as the first non-iPod device in podkit. This includes device detection, DeviceCapabilities implementation, and config support for user-specified device capabilities.

**Spec:** DOC-013 (Device Capabilities Interface — Echo Mini section)
**Device profile:** devices/echo-mini.md

**DeviceCapabilities for Echo Mini:**
```
artworkSources: ['sidecar', 'embedded']  (prefers sidecar, falls back to embedded)
artworkMaxResolution: 320  (estimated from device screen)
supportedAudioCodecs: ['mp3', 'flac', 'aac']
supportsVideo: false
```

**Device detection:**
- The Echo Mini appears as USB mass storage
- Detection method TBD — may need user to specify device type in config since there's no libgpod-style probe available

**Config support for user-specified capabilities:**
This is a pattern needed for any device that can't be auto-detected. The config should allow:
```toml
[[devices]]
name = "echo-mini"
type = "echo-mini"  # Selects Echo Mini capability preset
# OR explicit overrides for custom devices:
# artworkMaxResolution = 320
# artworkSources = ["sidecar", "embedded"]
```

**Note:** This task is a placeholder that will be expanded when Echo Mini support is actively developed. The scope of device detection, sync mechanism (file-based vs database), and integration testing will need further design work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Echo Mini DeviceCapabilities implemented with correct artworkSources, codec support, and max resolution
- [ ] #2 Config supports specifying device type to select Echo Mini capability preset
- [ ] #3 Config supports explicit capability overrides for custom/unknown devices
- [ ] #4 Sync engine correctly uses Echo Mini capabilities for transfer mode decisions
- [ ] #5 Device profile (devices/echo-mini.md) updated with implementation findings
<!-- AC:END -->
