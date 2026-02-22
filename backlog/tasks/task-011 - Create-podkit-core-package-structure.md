---
id: TASK-011
title: Create podkit-core package structure
status: To Do
assignee: []
created_date: '2026-02-22 19:09'
labels: []
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-002
references:
  - docs/ARCHITECTURE.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish the podkit-core package with initial module structure.

**Package structure:**
```
packages/podkit-core/
├── src/
│   ├── index.ts           # Public API exports
│   ├── adapters/          # Collection source adapters (M2)
│   │   └── interface.ts   # CollectionAdapter interface
│   ├── sync/              # Sync engine (M2)
│   │   └── types.ts       # SyncDiff, SyncPlan types
│   ├── transcode/         # Transcoding (M2)
│   │   └── types.ts       # TranscodePreset types
│   └── types.ts           # Shared types
├── package.json
└── tsconfig.json
```

**Goal:** Establish the shape of the codebase early, even if implementations are stubs. Define key interfaces from ARCHITECTURE.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Package structure created
- [ ] #2 Key interfaces defined (CollectionAdapter, SyncDiff, etc.)
- [ ] #3 Exports from index.ts
- [ ] #4 Depends on libgpod-node package
- [ ] #5 TypeScript compiles without errors
<!-- AC:END -->
