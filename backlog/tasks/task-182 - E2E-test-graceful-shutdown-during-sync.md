---
id: TASK-182
title: 'E2E test: graceful shutdown during sync'
status: To Do
assignee: []
created_date: '2026-03-21 21:48'
labels:
  - graceful-shutdown
  - e2e
dependencies: []
references:
  - packages/e2e-tests/
  - packages/test-fixtures/
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an end-to-end test that verifies the graceful shutdown flow:

1. Start a `podkit sync` process against a dummy iPod
2. Send SIGINT after some tracks have transferred
3. Verify the process exits with code 130
4. Verify the iPod database contains the tracks that completed before the signal
5. Verify no orphaned files exist

This requires spawning podkit as a child process and sending signals at the right time. Could use a slow transcode or a large number of tracks to create a reliable window for the signal.

**Approach ideas:**
- Use `child_process.spawn()` to run podkit
- Use a collection with many small files (test-fixtures can generate these)
- Wait for progress output indicating N tracks completed, then send SIGINT
- Open the dummy iPod database after exit and verify track count
- Scan iPod_Control/Music/F* and verify no orphan files
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Test spawns podkit sync as child process
- [ ] #2 Test sends SIGINT during active sync
- [ ] #3 Test verifies exit code 130
- [ ] #4 Test verifies completed tracks are in the database
- [ ] #5 Test verifies no orphaned files on disk
<!-- AC:END -->
