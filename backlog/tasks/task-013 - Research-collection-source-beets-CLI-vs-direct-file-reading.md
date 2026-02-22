---
id: TASK-013
title: 'Research collection source: beets CLI vs direct file reading'
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels:
  - research
  - decision
milestone: 'M2: Core Sync (v0.2.0)'
dependencies: []
references:
  - docs/COLLECTION-SOURCES.md
  - docs/adr/ADR-004-collection-sources.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decide how podkit will read music collections. Two main approaches:

**Option A: beets CLI**
- Use `beet ls -f ...` to query library
- Leverages beets' metadata parsing and library management
- Adds beets as a dependency
- Users must have beets configured

**Option B: Direct file reading**
- Scan directories for audio files
- Parse metadata ourselves (music-metadata or similar library)
- More portable, fewer dependencies
- Need to handle various formats (FLAC, MP3, M4A, etc.)

**Option C: Both via adapter pattern**
- Support both approaches
- User chooses via config/CLI flag

**Research areas:**
- beets CLI output formats and reliability
- TypeScript libraries for audio metadata parsing
- Performance implications of each approach
- User experience considerations

**Outcome:** Create/update ADR documenting decision.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Options evaluated with pros/cons documented
- [ ] #2 Metadata parsing approach validated with prototype
- [ ] #3 ADR created or updated with decision
- [ ] #4 Recommended approach has clear implementation path
<!-- AC:END -->
