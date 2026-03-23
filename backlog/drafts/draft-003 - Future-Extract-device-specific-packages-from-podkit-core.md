---
id: DRAFT-003
title: 'Future: Extract device-specific packages from podkit-core'
status: Draft
assignee: []
created_date: '2026-03-23 20:23'
labels:
  - architecture
  - future
milestone: m-14
dependencies: []
documentation:
  - backlog/docs/doc-020 - Architecture--Multi-Device-Support-Decisions.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Deferred decision — do not start until revisit conditions are met.**

Extract device-specific code from `podkit-core` into separate packages:
- `@podkit/ipod` — IpodDatabase, generation metadata, iPod content handlers, iPod diagnostics (depends on libgpod-node)
- `@podkit/mass-storage` — mass-storage device adapter, filesystem-based track management

This would make `@podkit/core` + `@podkit/mass-storage` pure TypeScript with only an FFmpeg runtime dependency, removing the native libgpod compilation requirement for developers who don't need iPod support.

The long-term goal is runtime-extensible device support where third-party developers can publish device packages (e.g., `@someone/podkit-device-walkman`) that plug into the core sync engine.

**Architecture doc:** DOC-020 (decisions 1 and 5)

**Revisit when:**
- There is community interest or a second consumer of the library APIs
- The internal module boundaries become hard to maintain
- The plugin system becomes a priority

**Prerequisites before starting:**
- DeviceAdapter interface is stable and proven across at least 2 device types
- MassStorageAdapter is implemented and working
<!-- SECTION:DESCRIPTION:END -->
