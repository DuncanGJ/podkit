---
"podkit": minor
"@podkit/core": minor
---

Add graceful shutdown handling for sync and doctor commands

Pressing Ctrl+C during `podkit sync` now triggers a graceful shutdown: the current operation finishes, all completed tracks are saved to the iPod database, and the process exits cleanly with code 130. Previously, Ctrl+C killed the process immediately, potentially leaving orphaned files and unsaved work.

- Sync: first Ctrl+C drains the current operation and saves; second Ctrl+C force-quits
- Doctor: repair operations save partial progress on interrupt
- Incremental saves: the database is now saved every 50 completed tracks during sync, reducing data loss from force-quits or crashes
- New `podkit doctor` check: detects orphaned files on the iPod (files not referenced by the database) with optional cleanup via `--repair orphan-files`
