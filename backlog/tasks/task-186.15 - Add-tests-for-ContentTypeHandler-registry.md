---
id: TASK-186.15
title: Add tests for ContentTypeHandler registry
status: To Do
assignee: []
created_date: '2026-03-22 12:57'
labels:
  - testing
dependencies: []
references:
  - packages/podkit-core/src/sync/content-type.ts
parent_task_id: TASK-186
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`packages/podkit-core/src/sync/content-type.ts` exports the handler registry (`registerHandler`, `getHandler`, `getAllHandlers`, `clearHandlers`) with **zero test coverage**. This is the dispatch mechanism for the entire unified pipeline — a bug here would silently break all handler lookup.

## What to test

Create `packages/podkit-core/src/sync/content-type.test.ts`:

1. **`registerHandler`** — registers a handler, can be retrieved by type
2. **`getHandler`** — returns `undefined` for unknown type, returns correct handler for known type
3. **`getAllHandlers`** — returns empty array initially, returns all registered handlers
4. **`clearHandlers`** — removes all registered handlers
5. **Multiple handlers** — register music and video, retrieve each by type
6. **Duplicate registration** — register same type twice, verify behavior (overwrite or error)

Use simple mock handlers implementing the `ContentTypeHandler` interface with stub methods.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 4 registry functions (registerHandler, getHandler, getAllHandlers, clearHandlers) have test coverage
- [ ] #2 Edge cases tested: unknown type, duplicate registration, empty registry
<!-- AC:END -->
