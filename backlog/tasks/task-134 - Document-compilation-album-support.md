---
id: TASK-134
title: Document compilation album support
status: To Do
assignee: []
created_date: '2026-03-13 23:27'
labels:
  - documentation
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
podkit fully supports the compilation flag across all layers (libgpod-node, core, CLI) but this isn't documented anywhere user-facing. Users with compilation albums (e.g., "Various Artists" albums, soundtracks) should know that podkit handles these correctly and understand how the flag is set from source metadata.

Areas to cover:
- How compilation albums are detected from source file metadata
- How the compilation flag is written to the iPod database
- How this affects iPod browsing (compilations appear under "Compilations" rather than cluttering individual artist lists)
- Relationship to the `albumartist` field
- Verification via `podkit device music --format json` (compilation field in output)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 User-facing documentation explains how compilation albums are handled during sync
- [ ] #2 Documentation covers how compilation flag relates to album artist and iPod browsing
<!-- AC:END -->
