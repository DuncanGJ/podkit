---
id: TASK-196
title: Rename fileMode → transferMode in config surface
status: To Do
assignee: []
created_date: '2026-03-23 14:07'
labels:
  - feature
  - config
  - cli
milestone: 'Transfer Mode: iPod Support'
dependencies:
  - TASK-195
references:
  - packages/podkit-cli/src/config/types.ts
  - packages/podkit-cli/src/config/loader.ts
  - packages/podkit-cli/src/commands/sync.ts
  - packages/podkit-cli/src/commands/init.ts
  - packages/podkit-cli/src/commands/music-presenter.ts
documentation:
  - backlog/docs/doc-011 - PRD--Transfer-Mode.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rename `fileMode` to `transferMode` across the entire config surface — config file, CLI flag, environment variable, per-device config, and config template. Add `'fast'` as the third tier and new default value.

**PRD:** DOC-011 (Transfer Mode)

**Config file:**
- `fileMode` field → `transferMode` in global and per-device config types
- Accepted values: `'fast'` | `'optimized'` | `'portable'` (was `'optimized'` | `'portable'`)
- Default: `'fast'` (was `'optimized'`)

**CLI flag:**
- `--file-mode` → `--transfer-mode`
- Accepts: `fast`, `optimized`, `portable`

**Environment variable:**
- `PODKIT_FILE_MODE` → `PODKIT_TRANSFER_MODE`

**Config loader:**
- Update file loader, env loader, device config loader, and merge logic
- Validation rejects invalid values with helpful error message listing valid options

**Config template (init command):**
- Update the TOML template to show `transferMode` with new default and all three options

**Threading:**
- `effectiveFileMode` → `effectiveTransferMode` in `MusicContentConfig` and anywhere it flows through the presenter/handler chain
- `deriveSettings()` updated for new field name
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 transferMode accepted from config file (global + per-device) with values fast/optimized/portable
- [ ] #2 PODKIT_TRANSFER_MODE environment variable loaded and validated
- [ ] #3 --transfer-mode CLI flag accepted by sync command
- [ ] #4 Default value is 'fast' when not specified
- [ ] #5 Old fileMode/--file-mode/PODKIT_FILE_MODE references removed throughout codebase
- [ ] #6 Config template updated with transferMode field and all three options
- [ ] #7 effectiveTransferMode threaded through MusicContentConfig and presenter/handler chain
- [ ] #8 Config loader tests cover file, env, CLI, per-device, and merge for all three values
- [ ] #9 Validation test confirms invalid values are rejected with helpful error
<!-- AC:END -->
