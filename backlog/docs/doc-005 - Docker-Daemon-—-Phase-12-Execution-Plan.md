---
id: doc-005
title: Docker Daemon — Phase 1+2 Execution Plan
type: other
created_date: '2026-03-19 12:53'
---
## Overview

Execution plan for Docker daemon mode (doc-004), covering Phase 1 (CLI foundations) and Phase 2 (daemon package). Phases 3-4 (notifications, hardening, docs, Synology validation) are deferred.

## Architecture Decisions

### Config sharing: not needed
The daemon is a thin CLI wrapper — it shells out to `podkit` for all sync operations. The CLI handles config loading, env vars, device resolution, and adapter creation. The daemon never loads config files. It reads only its own env vars (PODKIT_POLL_INTERVAL, PODKIT_APPRISE_URL).

### Smart device resolution in CLI
Rather than making the daemon UUID-aware, the CLI itself gains smart device resolution (TASK-161). When given `--device /path`, the CLI reads the filesystem UUID and matches against configured devices. This benefits all users, not just daemon mode, and keeps the daemon trivially thin.

### Safety: UUID mismatch error
If `--device <name>` resolves to a path whose UUID doesn't match the configured UUID for that device, the CLI errors. Prevents syncing wrong config to wrong iPod.

### Daemon build target
Bun-compiled binary (same as CLI). Not a Node.js script.

### TASK-145 subsumed
Docker USB auto-mount task is fully covered by TASK-161 + TASK-162. Marked as Done.

## Phase 1: CLI Foundations

### TASK-160 — Empty source abort
- Independent, no dependencies
- When adapter returns 0 tracks, skip that collection with error
- Safety guardrail for all users

### TASK-161 — CLI enhancements
Four sub-tasks:
1. **Mount --target** — new flag for fixed mount point
2. **Sync JSON enrichment** — albumCount, artistCount, videoSummary in dry-run output
3. **Smart device resolution** — UUID auto-matching in CLI resolution layer + DeviceManager enhancement in core
4. **Eject JSON verification** — confirm already works (likely no-op)

**Execution order:** TASK-160 and TASK-161 are independent, can be parallelized. Within TASK-161, mount/eject/sync-JSON are independent of each other. Smart device resolution touches the device resolver which is shared, so it should be done as a focused piece.

## Phase 2: Daemon Package (TASK-162)

Depends on TASK-161. Creates `packages/podkit-daemon` with:
- Device Poller (reuses core's lsblk/iPod detection)
- CLI Runner (subprocess pattern from e2e-tests)
- Sync Orchestrator (state machine)
- Entry point + Docker changes

## Deferred

- TASK-163: Apprise notifications (Phase 3)
- TASK-164: Health check + hardening (Phase 3)
- TASK-165: Documentation + Synology validation (Phase 4, HITL)
- TASK-146: Show UUID in device info (independent, nice-to-have)
