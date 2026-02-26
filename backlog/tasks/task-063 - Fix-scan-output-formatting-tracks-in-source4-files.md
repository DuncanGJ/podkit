---
id: TASK-063
title: Fix scan output formatting ("tracks in source4 files")
status: To Do
assignee: []
created_date: '2026-02-26 14:26'
labels:
  - bug
  - cli
  - cosmetic
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Bug

Sync output shows malformed text:
```
Found 1,414 tracks in source4 files
```

Should probably be:
```
Found 1,414 tracks in source
```
or:
```
Found 1,414 tracks (1,414 files)
```

## Cause

Likely a missing newline or string concatenation issue in the sync command output. The "4 files" appears to be remnant text from another message.

## Location

`packages/podkit-cli/src/commands/sync.ts` — look for the "Found X tracks" output line.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scan output displays correctly
- [ ] #2 No remnant text in output
<!-- AC:END -->
