---
id: TASK-029
title: End-to-end user testing with real files and iPod
status: To Do
assignee: []
created_date: '2026-02-22 19:38'
updated_date: '2026-02-26 00:25'
labels: []
milestone: 'M3: Production Ready (v1.0.0)'
dependencies:
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

## First E2E Test Session Plan (2026-02-26)

### Prerequisites

- iPod with **existing database** (already initialized, may have tracks from iTunes)
- Test FLAC collection copied locally
- CLI built and available

### Test Workflow

```bash
# 1. Setup config
podkit init                           # Creates ~/.config/podkit/config.toml
# Edit config to set:
#   source = "/path/to/test-flacs"
#   device = "/Volumes/iPod"
#   quality = "high"  # or medium/low
#   artwork = true

# 2. Verify iPod connection
podkit status                         # Should show device info + track count

# 3. View what's currently on iPod
podkit list                           # Shows existing tracks

# 4. View source collection
podkit list --source /path/to/test-flacs

# 5. Preview sync
podkit sync --dry-run                 # Shows what will be added/removed

# 6. Run sync
podkit sync                           # Actually sync - watch for errors

# 7. Verify sync worked
podkit list                           # Check track count increased
podkit status                         # Check storage usage changed

# 8. Eject manually
diskutil eject /Volumes/iPod

# 9. Physical test on device
# - Navigate to synced tracks
# - Verify artwork displays
# - Play tracks, check audio quality
```

### What to Watch For

1. **Config loading** - Does podkit find and use the config correctly?
2. **Error messages** - Are they clear when something goes wrong?
3. **Dry-run accuracy** - Does the preview match what actually syncs?
4. **Progress display** - Is sync progress clear and informative?
5. **Transcoding** - Are FLACs converted to AAC correctly?
6. **Artwork** - Does album art appear on device?
7. **Metadata** - Are title/artist/album preserved correctly?
8. **Performance** - How long does sync take for N tracks?

### Known Limitations for First Test

- **No artwork/format/bitrate in list output** (TASK-053 pending)
- **No safe-to-unmount message** (TASK-054 pending)
- **libgpod may log CRITICAL warnings** (TASK-041 - cosmetic, tests still work)

### Verification Workarounds

Until TASK-053 is complete, verify artwork/quality by:
- Checking on physical device
- Using `file` command on transcoded files in iPod_Control/Music/
- Using `ffprobe` to check bitrate of transcoded files

### After Testing

Document any issues found and create follow-up tasks for:
- Bugs discovered
- UX improvements needed
- Missing features identified
- Documentation gaps

## Dependency Update (2026-02-26)

Removed TASK-027 and TASK-028 (getting-started guides) as dependencies. The first E2E test will be run before the guides are written - findings from testing will inform the guide content.
<!-- SECTION:NOTES:END -->
