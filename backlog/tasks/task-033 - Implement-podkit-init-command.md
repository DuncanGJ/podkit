---
id: TASK-033
title: Implement podkit init command
status: To Do
assignee: []
created_date: '2026-02-22 22:16'
updated_date: '2026-02-22 22:16'
labels: []
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-006
  - TASK-032
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the `podkit init` command that creates a default configuration file.

**Current status:** Basic implementation complete in TASK-006. This task covers testing and integration with config system.

**Already implemented:**
- Creates `~/.config/podkit/config.toml` with commented example settings
- Errors if config file already exists (unless `--force` flag)
- Creates parent directories if they don't exist
- Displays helpful next steps after creation

**Remaining work:**
- Add tests for init command
- Share config path constant with config loading system (TASK-032)
- Ensure DEFAULT_CONFIG template stays in sync with config schema

**Options:**
- `--force` - overwrite existing config
- `--path <path>` - custom config location
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests cover all init command behavior
- [ ] #2 Config path constant shared with config loader
- [ ] #3 DEFAULT_CONFIG template matches config schema
<!-- AC:END -->
