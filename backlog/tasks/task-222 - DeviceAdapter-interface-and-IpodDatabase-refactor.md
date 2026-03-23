---
id: TASK-222
title: DeviceAdapter interface and IpodDatabase refactor
status: To Do
assignee: []
created_date: '2026-03-23 20:30'
labels:
  - architecture
  - core
  - refactor
milestone: m-14
dependencies: []
references:
  - packages/podkit-core/src/ipod/database.ts
  - packages/podkit-core/src/sync/content-type.ts
  - packages/podkit-core/src/sync/executor.ts
  - packages/podkit-core/src/sync/handlers/music-handler.ts
  - packages/podkit-core/src/sync/handlers/video-handler.ts
documentation:
  - backlog/docs/doc-020 - Architecture--Multi-Device-Support-Decisions.md
  - backlog/docs/doc-013 - Spec--Device-Capabilities-Interface.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the `DeviceAdapter` interface in core and refactor `IpodDatabase` to implement it. This is the foundational abstraction that enables non-iPod device support.

**Architecture doc:** DOC-020 (decision 2: thin DeviceAdapter interface, fat implementations)

**Interface design (from architecture discussion):**
```typescript
interface DeviceAdapter {
  readonly capabilities: DeviceCapabilities;

  // Track lifecycle
  getTracks(): DeviceTrack[];
  addTrack(input: TrackInput): Promise<DeviceTrack>;
  updateTrack(track: DeviceTrack, fields: Partial<TrackMetadata>): Promise<DeviceTrack>;
  removeTrack(track: DeviceTrack): Promise<void>;

  // Persistence
  save(): Promise<void>;
  close(): void;
}
```

The interface is intentionally thin — device-specific concerns (folder structure, database management, sidecar artwork, naming conventions) are handled internally by each implementation. The sync engine says "add this track" and the adapter figures out the rest.

**Key changes:**
1. Define `DeviceAdapter` interface and `DeviceTrack` type in `src/device/` or `src/sync/`
2. Make `IpodDatabase` implement `DeviceAdapter` (adapter wrapper or direct implementation)
3. Update `ContentTypeHandler` generic to use `DeviceAdapter`/`DeviceTrack` instead of `IpodDatabase`/`IPodTrack`
4. Update `MusicHandler` and `VideoHandler` to work against the generic interface
5. Update `ExecutionContext` to reference `DeviceAdapter` instead of `IpodDatabase`
6. Ensure all existing tests pass — this is a pure refactor with no behavior change

**Design considerations:**
- `DeviceTrack` needs to carry enough metadata for the differ/planner (artist, album, title, codec, bitrate, artwork hash, sync tags)
- iPod-specific fields (media type flags, ithmb artwork) stay on the iPod implementation, not the interface
- The `save()` method abstracts the difference between "write iTunesDB" (iPod) and "no-op or flush" (mass-storage)
- Consider whether `DeviceAdapter` should expose `capabilities` directly or if that's resolved separately during device detection
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DeviceAdapter interface defined with track CRUD, save, close, and capabilities
- [ ] #2 DeviceTrack type defined with metadata fields needed by differ/planner
- [ ] #3 IpodDatabase implements DeviceAdapter (wrapper or direct)
- [ ] #4 ContentTypeHandler generics updated to use DeviceAdapter/DeviceTrack
- [ ] #5 MusicHandler and VideoHandler work against DeviceAdapter interface
- [ ] #6 ExecutionContext references DeviceAdapter instead of IpodDatabase
- [ ] #7 All existing tests pass with no behavior change
- [ ] #8 iPod-specific fields remain on iPod implementation, not on the interface
<!-- AC:END -->
