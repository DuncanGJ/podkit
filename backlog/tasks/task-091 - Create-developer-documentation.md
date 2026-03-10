---
id: TASK-091
title: Create developer documentation
status: To Do
assignee: []
created_date: '2026-03-10 10:26'
labels:
  - docs-site
  - documentation
  - developer-facing
milestone: Documentation Website v1
dependencies:
  - TASK-089
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document the developer-facing aspects of podkit for library users and contributors.

## Scope

1. **libgpod-node section**
   - What it is and why it exists
   - Installation and basic usage
   - API reference or link to generated docs
   - Behavioral deviations from libgpod (already documented in package README)

2. **podkit-core section**
   - Building your own sync applications
   - Core concepts (adapters, sync engine, transcoding)
   - Example usage

3. **Contributing guide**
   - Development setup
   - Testing approach
   - PR process

4. **Architecture overview**
   - High-level system design (adapted from existing ARCHITECTURE.md)
   - Package responsibilities
   - Key design decisions (link to ADRs)

## Approach

This requires understanding the codebase deeply. The developer should:
1. Review existing developer docs (ARCHITECTURE.md, package READMEs, ADRs)
2. Identify what's suitable for external consumption
3. Propose structure and discuss
4. Write documentation that enables developers to use/contribute
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 libgpod-node has dedicated documentation section
- [ ] #2 podkit-core usage is documented
- [ ] #3 Contributing guide exists
- [ ] #4 Architecture overview adapted for web
<!-- AC:END -->
