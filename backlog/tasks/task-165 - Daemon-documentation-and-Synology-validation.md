---
id: TASK-165
title: 'Daemon: documentation and Synology validation'
status: In Progress
assignee: []
created_date: '2026-03-18 23:57'
updated_date: '2026-03-19 16:03'
labels:
  - daemon
  - docker
  - docs
  - synology
dependencies:
  - TASK-164
references:
  - docs/getting-started/docker.md
  - AGENTS.md
documentation:
  - backlog/documents/doc-004.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Write user-facing documentation for the daemon mode and validate on Synology NAS hardware.

See PRD doc-004 (Docker Daemon Mode) for full architecture context.

### Documentation

- New docs page for daemon mode setup (in `docs/getting-started/` or `docs/user-guide/`)
- Cover: Docker Compose setup, USB passthrough configuration, Apprise sidecar setup, env var reference (PODKIT_POLL_INTERVAL, PODKIT_APPRISE_URL), troubleshooting
- Synology-specific setup guide (how to configure USB passthrough in Synology Container Manager)
- Note untested compatibility with Unraid and TrueNAS
- Update existing Docker docs page (`docs/getting-started/docker.md`) to reference daemon mode
- Update AGENTS.md Docker section with daemon mode information

### Synology validation

Test the full daemon flow on a Synology NAS:
- USB passthrough to containers (may require --privileged on some models)
- lsblk availability inside the container
- iPod detection through Synology's virtualization layer
- Apprise sidecar running alongside the daemon
- End-to-end: plug in iPod → notification → sync → notification → eject
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Daemon mode docs page exists with Docker Compose setup, USB passthrough, Apprise config, and env var reference
- [ ] #2 Synology-specific setup guide covers Container Manager USB passthrough configuration
- [ ] #3 Docs note untested compatibility with Unraid and TrueNAS
- [ ] #4 Existing Docker docs page links to daemon mode documentation
- [ ] #5 AGENTS.md Docker section updated with daemon mode information
- [ ] #6 Minimum Docker permissions for daemon mode are identified and documented (testing ladder: cap_add → /dev mount → privileged)
- [ ] #7 Daemon has been tested end-to-end on Synology NAS hardware (iPod detected, synced, ejected, notifications received)
- [ ] #8 Any Synology-specific issues discovered during testing are documented or fixed
- [ ] #9 docker-compose.daemon.yml and docs updated with minimum required permissions
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Documentation Complete

**Created:**
- `docs/getting-started/docker-daemon.md` — full daemon mode guide
  
**Updated:**
- `docs/getting-started/docker.md` — links to daemon guide
- `docs/reference/environment-variables.md` — PODKIT_POLL_INTERVAL, PODKIT_APPRISE_URL
- `AGENTS.md` — Documentation Map and Docker Image section
- `docker/entrypoint.sh` — daemon runs as root for mount access
- `docker/docker-compose.daemon.yml` — currently uses privileged mode (pending testing)

## HITL: E2E Testing + Privilege Minimization

Blocked on TASK-168 (CI must build daemon binary first).

### Goal

Find the **minimum Docker permissions** needed for the daemon to work. `--privileged` is the nuclear option — we want to avoid it if possible since users (especially NAS users) are security-conscious.

### What the daemon needs from the host

1. **Block device visibility** — `lsblk` must see `/dev/sdb1` (or equivalent) when an iPod is plugged in. This is the key unknown: Docker normally only shows devices that existed at container start, not hotplugged devices.

2. **`/sys` filesystem access** — the daemon reads `/sys/block/<device>/device/` symlinks to check USB vendor ID (`0x05ac` for Apple). Docker mounts `/sys` read-only by default, but symlink resolution through USB device tree may or may not work.

3. **Mount capability** — `mount -t vfat /dev/sdb1 /ipod` requires `CAP_SYS_ADMIN`. The daemon process runs as root inside the container (entrypoint change already made).

### Testing ladder (least privileged → most privileged)

Test each tier on both a standard Linux Docker host and Synology NAS. For each tier, verify all 4 checkpoints below. Stop at the first tier where everything works.

**Tier 1: `--device /dev/bus/usb` + `--cap-add SYS_ADMIN`**
```yaml
devices:
  - /dev/bus/usb:/dev/bus/usb
cap_add:
  - SYS_ADMIN
```
Hypothesis: raw USB bus access + mount capability might be enough if the kernel creates block device nodes inside the container's devtmpfs.

**Tier 2: `-v /dev:/dev` + `--cap-add SYS_ADMIN`**
```yaml
volumes:
  - /dev:/dev
cap_add:
  - SYS_ADMIN
```
Hypothesis: bind-mounting the host's `/dev` makes hotplugged block devices visible because they appear on the host's devtmpfs which is now shared. CAP_SYS_ADMIN provides mount capability.

**Tier 3: `--device-cgroup-rule` + `/dev` mount + `--cap-add SYS_ADMIN`**
```yaml
volumes:
  - /dev:/dev
cap_add:
  - SYS_ADMIN
device_cgroup_rules:
  - 'a *:* rwm'
```
Hypothesis: if tier 2 fails due to cgroup device restrictions, explicitly allowing all device access should fix it.

**Tier 4: `--privileged` (fallback)**
```yaml
privileged: true
```
Full device access. This is the "it definitely works" option. Document it as the fallback but prefer a more targeted solution.

### Checkpoints for each tier

For each tier, plug in an iPod and verify:

- [ ] `docker compose exec podkit lsblk` shows the iPod's block device (e.g., `sdb1`)
- [ ] `docker compose exec podkit cat /sys/block/sdb/device/../../idVendor` returns `05ac` (or equivalent path through the symlink tree)
- [ ] `docker compose exec podkit mount -t vfat /dev/sdb1 /ipod` succeeds
- [ ] Full daemon cycle completes: detection → mount → sync → eject → notification

### Synology-specific concerns

- Synology Container Manager may not expose `cap_add` or `device_cgroup_rules` in its GUI — may need to use `docker compose` via SSH
- USB passthrough in Synology's Container Manager UI is limited to specific device nodes — may need `--privileged` regardless
- Test with both Container Manager GUI and CLI compose

### After testing

1. Update `docker/docker-compose.daemon.yml` with the minimum permissions discovered
2. Update `docs/getting-started/docker-daemon.md` USB Passthrough section with the tiered approach
3. If different platforms need different tiers, document per-platform recommendations
4. If `--privileged` is truly required, document why clearly so users understand the tradeoff
<!-- SECTION:NOTES:END -->
