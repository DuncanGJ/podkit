---
id: TASK-005
title: Research libgpod binding approach
status: To Do
assignee: []
created_date: '2026-02-22 19:08'
labels:
  - research
  - decision
milestone: 'M1: Foundation (v0.1.0)'
dependencies:
  - TASK-004
references:
  - docs/adr/ADR-002-libgpod-binding.md
  - docs/LIBGPOD.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate the recommended binding approach from ADR-002 before committing to implementation.

**Spike goals:**
- Test ffi-napi with libgpod on macOS
- Assess complexity of GLib type handling (GList, GError)
- Evaluate memory management challenges
- Test basic operations: itdb_parse, itdb_write, itdb_track_new
- Document any blockers or concerns

**Decision needed:**
- Confirm ffi-napi for prototype phase, or pivot to alternative
- Update ADR-002 status to "Accepted" with findings

**Alternatives if ffi-napi problematic:**
- node-addon-api (N-API) directly
- Rust + napi-rs
- Different abstraction layer
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ffi-napi tested with libgpod on macOS
- [ ] #2 GLib type handling complexity assessed
- [ ] #3 Spike code demonstrates basic libgpod operations
- [ ] #4 ADR-002 updated to Accepted with findings documented
- [ ] #5 Clear recommendation for implementation approach
<!-- AC:END -->
