---
id: TASK-008
title: Create libgpod-node package with bindings
status: To Do
assignee: []
created_date: '2026-02-22 19:09'
labels: []
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-005
references:
  - docs/ARCHITECTURE.md
  - docs/LIBGPOD.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the libgpod-node package using the binding approach validated in TASK-005.

**Package structure:**
```
packages/libgpod-node/
├── src/
│   ├── index.ts        # Public API exports
│   ├── binding.ts      # Native binding layer
│   ├── database.ts     # iTunesDB operations
│   ├── track.ts        # Track management
│   └── types.ts        # TypeScript definitions
├── package.json
└── tsconfig.json
```

**Initial bindings to implement:**
- Database: itdb_parse, itdb_write, itdb_free
- Device: itdb_device_get_ipod_info
- Track: itdb_track_new, itdb_track_add

**Note:** Read/write track functionality will be implemented in subsequent tasks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Package structure created per architecture doc
- [ ] #2 Binding layer implemented using approach from TASK-005
- [ ] #3 TypeScript types defined for libgpod structures
- [ ] #4 Can parse an iPod database (test environment)
- [ ] #5 Exports clean public API
<!-- AC:END -->
