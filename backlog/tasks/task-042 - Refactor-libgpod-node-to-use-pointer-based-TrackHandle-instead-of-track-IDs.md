---
id: TASK-042
title: Refactor libgpod-node to use pointer-based TrackHandle instead of track IDs
status: To Do
assignee: []
created_date: '2026-02-25 13:37'
updated_date: '2026-02-25 13:40'
labels:
  - libgpod-node
  - breaking-change
  - api-design
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Summary

The current libgpod-node implementation incorrectly uses `track->id` and `itdb_track_by_id()` as the primary mechanism for referencing tracks. This is fundamentally broken because:

1. `track->id` is 0 for all newly added tracks until `itdb_write()` is called
2. libgpod's own documentation says `itdb_track_by_id()` is **"not really a good idea"** - it's only for internal use during iTunesDB import
3. Track IDs are **reassigned on every `itdb_write()`** - they're not stable identifiers

Real-world libgpod users (like Strawberry) use `Itdb_Track*` pointers directly and never call `itdb_track_by_id()`.

## Current Broken Behavior

```typescript
const track1 = db.addTrack({ title: 'Song 1' });  // id: 0
const track2 = db.addTrack({ title: 'Song 2' });  // id: 0

// BROKEN: Both have id=0, so this operates on wrong track
db.copyTrackToDevice(track2.id, '/path/to/file.mp3');
```

## Target Design

```typescript
const handle1 = db.addTrack({ title: 'Song 1' });  // Returns TrackHandle
const handle2 = db.addTrack({ title: 'Song 2' });  // Returns TrackHandle

// WORKS: Handle references the actual pointer internally
db.copyTrackToDevice(handle2, '/path/to/file.mp3');

// Get track data snapshot when needed
const track2Data: Track = db.getTrack(handle2);
```

## Key Design Principles

1. **API parity with libgpod** - The wrapper should mirror how libgpod actually works (pointer-based), not invent ID-based semantics
2. **TrackHandle is an opaque reference** - Internally backed by pointer, exposed as numeric index
3. **Track is a data snapshot** - The actual metadata, distinct from the handle
4. **Handles valid after save()** - Because pointers remain valid after `itdb_write()`
5. **Convenience operations belong in podkit-core** - libgpod-node stays thin
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TrackHandle type exists and is returned by addTrack(), getTracks()
- [ ] #2 All track operations accept TrackHandle instead of trackId
- [ ] #3 Multiple tracks can be added and operated on before save() without issues
- [ ] #4 Handles remain valid after save()
- [ ] #5 Track (data snapshot) and TrackHandle (reference) are distinct types
- [ ] #6 getTrackById() is removed (not exposed) with documentation explaining why
- [ ] #7 libgpod ID behavior is documented in LIBGPOD.md
- [ ] #8 All existing tests updated and passing
- [ ] #9 New tests cover multi-track operations before save
<!-- AC:END -->
