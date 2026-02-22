---
id: TASK-019
title: Implement FFmpeg transcoding with tests
status: To Do
assignee: []
created_date: '2026-02-22 19:23'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-014
references:
  - docs/TRANSCODING.md
  - docs/adr/ADR-003-transcoding.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement audio transcoding using FFmpeg based on decisions from TASK-014.

**Implementation:**
- Spawn FFmpeg process with correct arguments
- Quality presets (high, medium, low) per ADR-003
- Preserve metadata in transcoded output
- Handle errors (FFmpeg not found, encode failure, etc.)

**Testing requirements:**
- Unit tests for FFmpeg command generation
- Integration tests with real transcoding
- Verify output file is valid audio
- Verify metadata preserved in output
- Test each quality preset
- Test error handling (invalid input, missing FFmpeg)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 FFmpeg transcoding works on macOS and Linux
- [ ] #2 Quality presets implemented
- [ ] #3 Metadata preserved in transcoded files
- [ ] #4 Integration tests verify output validity
- [ ] #5 Error handling tested
- [ ] #6 Tests for each preset
<!-- AC:END -->
