---
id: TASK-166
title: Config Migration Wizard
status: To Do
assignee: []
created_date: '2026-03-19 14:41'
labels:
  - config
  - cli
  - infrastructure
milestone: Config Migration Wizard
dependencies: []
references:
  - doc-006
  - doc-007
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Parent task for the config migration wizard system. See PRD: doc-006.

Adds a versioned config system with a `podkit migrate` command that detects outdated configs, communicates breaking changes vs new optional features, and walks users through an interactive wizard to update their config file.

This is a prerequisite for the Video Collection Split (doc-007) which will be the first real migration (version 0→1).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Config files have a version field; missing version is treated as version 0
- [ ] #2 Running any command with an outdated config shows a hard error pointing to `podkit migrate`
- [ ] #3 Running any command with a current config but new optional features shows an info tip
- [ ] #4 `podkit migrate` detects version, shows plan, runs migrations in order, backs up original, writes updated config
- [ ] #5 Interactive migrations can prompt users for decisions and abort safely
- [ ] #6 Migration scenarios are documented with example code for future developers
- [ ] #7 AGENTS.md and developer guide updated with migration system guidance
<!-- AC:END -->
