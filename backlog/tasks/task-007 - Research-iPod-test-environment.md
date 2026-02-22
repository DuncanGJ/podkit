---
id: TASK-007
title: Research iPod test environment
status: To Do
assignee: []
created_date: '2026-02-22 19:08'
labels:
  - research
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-004
references:
  - docs/LIBGPOD.md
  - docs/IPOD-INTERNALS.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate options for testing libgpod bindings without requiring a physical iPod.

**Research areas:**
- Can we create a valid iTunesDB from scratch?
- libgpod test utilities or fixtures
- Existing test approaches in gtkpod/Strawberry
- Virtual/loopback filesystem with iPod structure
- Minimal files needed for libgpod to recognize as iPod

**Goal:** Define a reproducible test environment that:
- Can be created/destroyed in CI
- Allows testing all libgpod operations
- Doesn't require physical device
- Enables extensive unit test coverage

**Outcome:** Document findings and recommended approach for TASK-003 (testing strategy).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 iTunesDB creation options documented
- [ ] #2 Existing test approaches researched (gtkpod, Strawberry)
- [ ] #3 Recommended test environment approach defined
- [ ] #4 Findings documented for TASK-003
- [ ] #5 Proof of concept test iPod structure created
<!-- AC:END -->
