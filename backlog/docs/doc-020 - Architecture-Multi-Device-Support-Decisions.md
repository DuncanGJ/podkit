---
id: doc-020
title: 'Architecture: Multi-Device Support Decisions'
type: other
created_date: '2026-03-23 20:23'
updated_date: '2026-03-23 20:32'
---
## Overview

Architectural decisions made during design discussion for adding non-iPod device support to podkit, starting with the FiiO Echo Mini. These decisions guide the existing Echo Mini milestone (m-14) and future device work.

## Task Dependency Chain

```
TASK-221 (investigate Echo Mini) ───────────────────────────────────┐
                                                                     │
TASK-222 (DeviceAdapter interface + IpodDatabase refactor) ─────────┤
                                                                     │
TASK-203 (embedded artwork resize) ──┐                               │
TASK-204 (sidecar artwork) ──────────┼── TASK-205 (wire transfer) ──┤
    ↑ depends on TASK-221            │                               │
                                      │                               │
                                      ├── TASK-223 (MassStorageAdapter)
                                      │        │
                                      │   TASK-224 (config + detection)
                                      │        │
                                      │   TASK-225 (CLI multi-device)
                                      │        │
                                      └── TASK-226 (E2E validation) ← milestone complete
```

**Superseded:** TASK-206 (original placeholder) → replaced by TASK-222, 223, 224, 225, 226.
**Deferred:** DRAFT-003 (package extraction) → revisit when there's community demand.

## Decisions

### 1. No package split now — clean internal module boundaries

**Decision:** Keep all device-specific code in `podkit-core` with clean internal module boundaries (e.g., `src/ipod/`, `src/diagnostics/ipod/`, `src/diagnostics/mass-storage/`). Do NOT extract `@podkit/ipod` or `@podkit/mass-storage` as separate packages.

**Why:** The only consumer is `podkit-cli`. A package split is a significant refactor (every handler, test, and import path changes) with no immediate benefit. The architecture should support a future split without requiring one now.

**Revisit when:** There is community interest, a second consumer of the library, or the internal boundaries become hard to maintain.

**Tracked as:** DRAFT-003

### 2. Thin DeviceAdapter interface, fat implementations

**Decision:** Define a `DeviceAdapter` interface in core that both `IpodDatabase` and a new `MassStorageDevice` both implement. The interface should be thin — track CRUD (get, add, update, remove) plus save/close. Device-specific concerns (folder structure, database management, sidecar artwork, naming conventions) are handled internally by each implementation.

**Why:** The sync engine should say "add this track" and the adapter figures out the rest. This keeps the orchestration layer simple and means new device types don't require changes to the sync engine.

**Tracked as:** TASK-222

### 3. One MassStorageAdapter, configurable via DeviceCapabilities

**Decision:** Build a single `MassStorageAdapter` that handles all mass-storage DAPs (Echo Mini, Rockbox, generic). Device variation is expressed through `DeviceCapabilities` (artwork sources, codec support, etc.), not separate adapter implementations.

**Escape hatch:** If a device truly needs fundamentally different behavior, create a new `DeviceAdapter` implementation. But don't build for this until needed.

**Tracked as:** TASK-223

### 4. Content type handlers stay, parameterized by capabilities

**Decision:** `MusicHandler` and `VideoHandler` remain the ContentTypeHandler implementations. They are parameterized by `DeviceCapabilities` (already specced in DOC-013) rather than creating device-specific handlers. The planner queries capabilities to make artwork/codec decisions.

**Why:** The content type axis (music vs video) and device type axis (iPod vs mass-storage) are independent. Capabilities are sufficient to parameterize device variation in the planning layer.

### 5. Plugin system is a north-star goal, not built now

**Decision:** The long-term vision is runtime-extensible device support (e.g., `podkit install @someone/podkit-device-walkman`). This is NOT built now. The current architecture (thin DeviceAdapter interface, capability-driven planning, isolated device modules) is the foundation that would become pluggable later.

**Revisit when:** Package split happens (Decision 1) and there's demand for third-party device support.

**Tracked as:** DRAFT-003 (combined with package extraction)

### 6. Device detection: three-tier strategy

**Decision:**
1. **Fully automatic** — probe filesystem, identify device, derive capabilities (iPod today, possibly Echo Mini if USB IDs or filesystem markers are identifiable)
2. **Wizard-assisted** — `podkit device setup` interactive flow: probe what's available, ask user to confirm/select, persist to config. Universal onboarding path for all device types.
3. **Manual config** — user specifies everything in config

**Why:** The current iPod flow is plug-and-play. Mass-storage devices may not expose enough signal for full auto-detection. The wizard bridges the gap without forcing manual config editing.

**Tracked as:** TASK-224

### 7. Diagnostics stays in core, organized by device module

**Decision:** The diagnostics framework remains in `podkit-core`. Device-specific checks are organized in subdirectories (`src/diagnostics/ipod/`, `src/diagnostics/mass-storage/`). The generic framework (DiagnosticCheck interface) stays at the top level.

### 8. Sync is device-first

**Confirmed:** The sync mental model starts with a device, then resolves which collections apply. The `DeviceAdapter` is resolved once at the start of a sync run. No multi-device orchestration needed in the engine.
