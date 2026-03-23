---
id: TASK-224
title: Config and detection support for non-iPod devices
status: To Do
assignee: []
created_date: '2026-03-23 20:31'
labels:
  - feature
  - cli
  - config
milestone: m-14
dependencies:
  - TASK-221
  - TASK-222
references:
  - packages/podkit-cli/src/device-resolver.ts
  - packages/podkit-core/src/config/
documentation:
  - backlog/docs/doc-020 - Architecture--Multi-Device-Support-Decisions.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add config schema and device detection support for mass-storage devices. This enables podkit to identify, remember, and configure non-iPod devices.

**Architecture doc:** DOC-020 (decision 6: three-tier detection strategy)

**Three-tier detection:**
1. **Fully automatic** — probe filesystem for device markers (e.g., specific directories, USB vendor/product ID). Works for iPod today; may work for Echo Mini if investigation (TASK-221) reveals identifiable markers.
2. **Wizard-assisted** — `podkit device setup` interactive flow: probe what's available, show the user what was found, let them confirm or select device type, persist to config. This is the universal onboarding path.
3. **Manual config** — user writes device config directly in TOML.

**Config schema changes:**
```toml
[[devices]]
name = "my-echo-mini"
path = "/Volumes/ECHO_MINI"       # Mount point or volume name
type = "echo-mini"                 # Selects capability preset
# Optional explicit capability overrides:
# artworkMaxResolution = 320
# artworkSources = ["sidecar", "embedded"]
# supportedAudioCodecs = ["mp3", "flac", "aac"]
```

**Device type presets:**
- `"ipod"` — auto-detected, capabilities from generation metadata (existing behavior)
- `"echo-mini"` — capabilities from device profile
- `"rockbox"` — capabilities from hardware model (future)
- `"generic"` — user specifies all capabilities manually

**Wizard flow (`podkit device setup`):**
1. List connected removable volumes
2. Attempt auto-detection (iPod probe, USB ID matching, filesystem markers)
3. If auto-detected: "Found Echo Mini at /Volumes/ECHO_MINI — correct?" → persist
4. If not auto-detected: show list of supported device types, let user select → persist
5. Optionally allow capability overrides for power users

**How this integrates with existing device resolution:**
The current device resolver finds iPods by auto-detection or config. This extends it to:
- Check config for non-iPod device entries
- Use device type to select the correct `DeviceAdapter` implementation (iPod → IpodDatabase, echo-mini/rockbox/generic → MassStorageAdapter)
- Pass capabilities to the adapter

**Depends on TASK-221 for:** USB identification details, filesystem markers to detect Echo Mini automatically.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Config schema supports [[devices]] entries with name, path, type, and optional capability overrides
- [ ] #2 Device type presets defined for echo-mini (and generic) with correct DeviceCapabilities
- [ ] #3 Device resolver updated to resolve non-iPod devices from config
- [ ] #4 Device resolver selects correct DeviceAdapter implementation based on device type
- [ ] #5 podkit device setup wizard implemented with auto-detect → confirm → persist flow
- [ ] #6 Wizard falls back to manual device type selection when auto-detection fails
- [ ] #7 Existing iPod auto-detection continues to work unchanged
<!-- AC:END -->
