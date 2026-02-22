---
id: TASK-014
title: Research FFmpeg AAC encoder availability
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels:
  - research
  - decision
milestone: 'M2: Core Sync (v0.2.0)'
dependencies: []
references:
  - docs/TRANSCODING.md
  - docs/adr/ADR-003-transcoding.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finalize the FFmpeg/AAC encoder decision for macOS and Linux.

**Key questions:**
- Which AAC encoders are available in standard FFmpeg builds?
- Is libfdk_aac available, or only the native FFmpeg AAC encoder?
- Quality comparison: libfdk_aac vs FFmpeg native AAC vs qaac (macOS only)
- What are the installation requirements on each platform?

**Platforms to verify:**
- macOS (Homebrew FFmpeg)
- Debian/Ubuntu (apt FFmpeg)
- Consider: Docker/CI environments

**Outcome:** 
- Update ADR-003 to Accepted status
- Document recommended encoder settings per platform
- Document installation instructions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AAC encoder availability verified on macOS and Linux
- [ ] #2 Quality comparison documented
- [ ] #3 Installation requirements documented
- [ ] #4 ADR-003 updated to Accepted
- [ ] #5 Recommended encoder settings defined per platform
<!-- AC:END -->
