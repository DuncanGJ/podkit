---
id: TASK-012
title: Implement podkit status command
status: To Do
assignee: []
created_date: '2026-02-22 19:09'
updated_date: '2026-02-22 22:16'
labels: []
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-006
  - TASK-009
  - TASK-032
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a working `podkit status` command that proves the full stack.

**Functionality:**
- Detect connected iPod (or accept --device path)
- Display device info (model, capacity, free space)
- Display track count
- Handle "no iPod found" gracefully

**Example output:**
```
iPod Classic (80GB) - 6th Generation
Mount: /Volumes/IPOD
Storage: 45.2 GB used / 74.4 GB total (60%)
Tracks: 8,432
```

This command validates: CLI → podkit-core → libgpod-node → libgpod
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 podkit status shows device info
- [ ] #2 Shows track count from database
- [ ] #3 Handles no device gracefully
- [ ] #4 Supports --device flag for explicit path
- [ ] #5 Supports --json output format
<!-- AC:END -->
