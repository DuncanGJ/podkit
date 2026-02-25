---
id: TASK-042.05
title: Update podkit-core to use TrackHandle API
status: To Do
assignee: []
created_date: '2026-02-25 13:38'
labels:
  - podkit-core
dependencies:
  - TASK-042
parent_task_id: TASK-042
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After libgpod-node is updated, update podkit-core to use the new TrackHandle-based API.

## Executor Changes (`sync/executor.ts`)

The executor currently does:
```typescript
const track = this.database.addTrack(trackInput);
this.database.copyTrackToDevice(track.id, outputPath);
```

Update to:
```typescript
const handle = this.database.addTrack(trackInput);
this.database.copyTrackToDevice(handle, outputPath);
const track = this.database.getTrack(handle);
```

## Review All Database Usage

Search for all usages of:
- `db.addTrack()`
- `db.copyTrackToDevice()`
- `db.removeTrack()`
- `db.updateTrack()`
- `track.id` references
- `db.getTrackById()`

Update each to use TrackHandle.

## Test Updates

Update all integration tests in podkit-core that use libgpod-node:
- `executor.integration.test.ts`
- Any other files using Database operations

## Consider Convenience Methods

If common patterns emerge (e.g., add track + copy file + get data), consider adding convenience methods to podkit-core (not libgpod-node) that wrap multiple operations.
<!-- SECTION:DESCRIPTION:END -->
