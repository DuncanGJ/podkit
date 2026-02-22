---
id: TASK-032
title: Implement config loading system
status: To Do
assignee: []
created_date: '2026-02-22 22:16'
labels: []
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-006
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the configuration loading system that merges settings from multiple sources.

**Loading order (lowest to highest priority):**
1. Defaults (hardcoded in code)
2. Default config file (`~/.config/podkit/config.toml`)
3. Config file via `--config <path>` flag
4. Environment variables (`PODKIT_SOURCE`, `PODKIT_DEVICE`, `PODKIT_QUALITY`)
5. CLI arguments

**Config file format (TOML):**
```toml
source = "/path/to/music"
device = "/media/ipod"
quality = "high"
artwork = true
```

**Implementation:**
- Parse TOML config files
- Read environment variables with `PODKIT_` prefix
- Merge sources in priority order
- Export typed config object for commands to use
- Handle missing config file gracefully (use defaults)

**Dependencies:**
- Need a TOML parser (consider `@iarna/toml` or `smol-toml`)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Config loads from ~/.config/podkit/config.toml
- [ ] #2 Config loads from custom --config path
- [ ] #3 Environment variables override config file
- [ ] #4 CLI arguments override everything
- [ ] #5 Missing config file doesn't error (uses defaults)
- [ ] #6 Typed config object available to commands
<!-- AC:END -->
