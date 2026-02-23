---
id: TASK-029
title: End-to-end user testing with real files and iPod
status: To Do
assignee: []
created_date: '2026-02-22 19:38'
updated_date: '2026-02-23 16:29'
labels: []
milestone: 'M3: Production Ready (v1.0.0)'
dependencies:
  - TASK-027
  - TASK-028
  - TASK-025
  - TASK-026
  - TASK-039
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Comprehensive testing session with real music files and physical iPod.

**Goals:**
- Validate full workflow works end-to-end
- Test documentation clarity (follow getting-started guide)
- Identify bugs and edge cases
- Gather feedback for improvements

**Test scenarios:**
- Fresh iPod (first sync)
- Incremental sync (add new tracks)
- Large library (100+ tracks)
- Various file formats
- Files with/without artwork
- Error scenarios (bad files, full iPod)

**Process:**
1. Follow getting-started guide on clean system
2. Run through test scenarios
3. Document issues found
4. Create follow-up tasks for bugs/improvements

**This is the final validation before 1.0 release.**
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Full workflow tested end-to-end
- [ ] #2 Documentation validated by following it
- [ ] #3 Test scenarios completed
- [ ] #4 Issues documented and triaged
- [ ] #5 Ready for 1.0 release
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferred from M2 - integration tests provide sufficient coverage for now

## E2E Test Infrastructure (TASK-039)

Automated E2E test package now available at `packages/e2e-tests/`. This provides:

**For CI (dummy iPod):**
```bash
bun run test:e2e
```

**For real iPod validation:**
```bash
# Run pre-flight checks first
cd packages/e2e-tests
IPOD_MOUNT=/Volumes/iPod bun run preflight

# Run tests against real device
IPOD_MOUNT=/Volumes/iPod bun run test:e2e:real
```

**Pre-flight checks verify:**
- CLI is built
- gpod-tool available
- FFmpeg available
- Test fixtures exist
- iPod mount accessible
- iTunesDB readable
- Sufficient free space (50MB)
- Write permissions

**Test coverage:**
- 37 automated tests across init, status, list, sync commands
- Fresh sync workflow (empty iPod → sync → verify)
- Incremental sync workflow (add tracks progressively)

The automated tests complement this manual validation task - they ensure the happy path works, while manual testing covers edge cases and real-world scenarios.
<!-- SECTION:NOTES:END -->
