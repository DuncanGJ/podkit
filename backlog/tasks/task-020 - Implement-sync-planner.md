---
id: TASK-020
title: Implement sync planner
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-018
references:
  - docs/ARCHITECTURE.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the planner that converts a diff into a sync plan.

**Input:** SyncDiff (from diff engine)
**Output:** SyncPlan with ordered operations

**Operations to plan:**
- transcode: source needs format conversion
- copy: source already iPod-compatible
- remove: track should be removed from iPod (if enabled)

**Planning logic:**
- Check if source format needs transcoding
- Estimate output sizes
- Check available space on iPod
- Order operations sensibly

**Testing requirements:**
- Unit tests for operation planning
- Test transcode vs copy decisions
- Test space calculation
- Test with various input scenarios
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Planner generates correct operations from diff
- [ ] #2 Correctly identifies transcode vs copy
- [ ] #3 Estimates output sizes
- [ ] #4 Checks available iPod space
- [ ] #5 Unit tests for planning logic
<!-- AC:END -->
