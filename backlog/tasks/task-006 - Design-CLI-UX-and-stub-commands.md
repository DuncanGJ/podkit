---
id: TASK-006
title: Design CLI UX and stub commands
status: To Do
assignee: []
created_date: '2026-02-22 19:08'
labels:
  - decision
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-002
references:
  - docs/PRD.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Design the CLI user experience and create stubbed commands with documentation.

**Requirements:**
- Use commander library
- Bun runtime with Node APIs
- All planned commands stubbed with --help documentation

**Commands to design (from PRD):**
- `podkit sync` - Main sync command with options
- `podkit status` - Show iPod info and connection status
- `podkit list` - List tracks (on device or in collection)

**Deliverables:**
- CLI command structure documented
- All commands stubbed and respond to --help
- README section on CLI usage
- Consider: global options, output formats (--json), verbosity levels
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CLI command structure documented
- [ ] #2 All commands stubbed with working --help
- [ ] #3 Uses commander library
- [ ] #4 Runs with Bun using Node APIs
- [ ] #5 Global options defined (--verbose, --json, etc.)
<!-- AC:END -->
