---
id: TASK-042.03
title: Update libgpod-node tests for TrackHandle API
status: To Do
assignee: []
created_date: '2026-02-25 13:38'
labels:
  - libgpod-node
  - testing
dependencies: []
parent_task_id: TASK-042
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update all existing tests and add new tests for the TrackHandle-based API.

## Existing Test Updates

Update all tests in `packages/libgpod-node/src/__tests__/` to use TrackHandle:
- `database.integration.test.ts`
- `tracks.integration.test.ts`
- `artwork.integration.test.ts`
- `playlists.integration.test.ts`
- Any other test files using track operations

## New Test Cases

### Multi-track operations before save
```typescript
it('can add multiple tracks and operate on each before save', async () => {
  const handle1 = db.addTrack({ title: 'Track 1' });
  const handle2 = db.addTrack({ title: 'Track 2' });
  const handle3 = db.addTrack({ title: 'Track 3' });
  
  // All operations should work on correct tracks
  db.copyTrackToDevice(handle1, mp3Path1);
  db.copyTrackToDevice(handle2, mp3Path2);
  db.copyTrackToDevice(handle3, mp3Path3);
  
  db.setTrackThumbnails(handle2, artworkPath);
  
  await db.save();
  
  // Verify each track has correct data
  const track1 = db.getTrack(handle1);
  const track2 = db.getTrack(handle2);
  const track3 = db.getTrack(handle3);
  
  expect(track1.ipodPath).toBeTruthy();
  expect(track2.ipodPath).toBeTruthy();
  expect(track2.hasArtwork).toBe(true);
  expect(track3.ipodPath).toBeTruthy();
});
```

### Handle validity after save
```typescript
it('handles remain valid after save', async () => {
  const handle = db.addTrack({ title: 'Test' });
  db.copyTrackToDevice(handle, mp3Path);
  
  await db.save();
  
  // Handle should still work
  const track = db.getTrack(handle);
  expect(track.title).toBe('Test');
  
  // Can still operate on track
  db.updateTrack(handle, { title: 'Updated' });
});
```

### Handle invalidation on remove
```typescript
it('throws when using handle after track removed', async () => {
  const handle = db.addTrack({ title: 'Test' });
  db.removeTrack(handle);
  
  expect(() => db.getTrack(handle)).toThrow(/invalid.*handle/i);
});
```

### Existing tracks get handles
```typescript
it('getTracks returns handles for existing tracks', async () => {
  // Add tracks and save
  db.addTrack({ title: 'Existing 1' });
  db.addTrack({ title: 'Existing 2' });
  await db.save();
  db.close();
  
  // Reopen
  const db2 = await Database.open(ipodPath);
  const handles = db2.getTracks();
  
  expect(handles).toHaveLength(2);
  
  // Can operate on loaded tracks
  const track1 = db2.getTrack(handles[0]);
  expect(track1.title).toBe('Existing 1');
});
```
<!-- SECTION:DESCRIPTION:END -->
