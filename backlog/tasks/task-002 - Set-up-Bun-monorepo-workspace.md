---
id: TASK-002
title: Set up Bun monorepo workspace
status: To Do
assignee: []
created_date: '2026-02-22 18:32'
labels: []
milestone: 'M0: Project Bootstrap'
dependencies: []
references:
  - docs/adr/ADR-001-runtime.md
  - docs/ARCHITECTURE.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Initialize the Bun workspace/monorepo structure for the three packages:
- packages/libgpod-node
- packages/podkit-core  
- packages/podkit-cli

This includes:
- Root package.json with workspaces configuration
- Package-level package.json files with correct dependencies
- TypeScript configuration (tsconfig.json) for the monorepo
- Basic build scripts

Reference ADR-001 for runtime decisions (Bun dev, Node distribution).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Root package.json with workspaces configured
- [ ] #2 All three package directories created with package.json
- [ ] #3 TypeScript configured for monorepo
- [ ] #4 bun install works without errors
- [ ] #5 Basic bun test and bun run build scripts defined
<!-- AC:END -->
