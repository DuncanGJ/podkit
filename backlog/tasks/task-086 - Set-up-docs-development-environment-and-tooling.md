---
id: TASK-086
title: Set up docs development environment and tooling
status: To Do
assignee: []
created_date: '2026-03-10 10:25'
labels:
  - docs-site
  - setup
milestone: Documentation Website v1
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prepare the development environment for working with Astro and Starlight. This is a foundational task to ensure developers can effectively work on the documentation site.

## Scope

1. **Install Astro skill** - Add the astro skill from https://skills.sh/astrolicious/agent-skills/astro to enable AI agents to work effectively with Astro projects

2. **Document Starlight/Astro workflow** - Add guidance to AGENTS.md or a new docs file covering:
   - How to run the docs site locally
   - Starlight conventions and configuration
   - Content collections structure
   - Frontmatter requirements and validation

3. **Verify tooling** - Ensure bun/node can run Astro dev server in the monorepo context
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Astro skill installed and configured
- [ ] #2 Developer documentation exists for working with the docs site
- [ ] #3 Dev server runs successfully in monorepo
<!-- AC:END -->
