---
id: TASK-056
title: Fix podkit list defaulting to source instead of iPod
status: To Do
assignee: []
created_date: '2026-02-26 11:37'
labels:
  - bug
  - cli
  - e2e-finding
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Bug found in E2E testing (TASK-029)**

`podkit list` shows the source collection by default instead of iPod tracks. This contradicts the help text which says it should list iPod tracks by default, with `--source` for collection.

**Current behavior:**
- `podkit list` → shows source collection (from config)
- `podkit list --source <path>` → shows source collection

**Expected behavior:**
- `podkit list` → shows iPod tracks
- `podkit list --source <path>` → shows source collection

**Root cause:** The list command is using the source from config by default instead of defaulting to iPod.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 podkit list shows iPod tracks by default
- [ ] #2 podkit list --source shows collection
- [ ] #3 Help text matches actual behavior
<!-- AC:END -->
