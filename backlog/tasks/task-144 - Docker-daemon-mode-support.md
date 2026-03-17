---
id: TASK-144
title: Docker daemon mode support
status: To Do
assignee: []
created_date: '2026-03-17 20:50'
labels:
  - docker
  - daemon
  - future
dependencies: []
references:
  - docker/Dockerfile
  - docker/entrypoint.sh
  - docs/getting-started/docker.md
documentation:
  - AGENTS.md (Docker Image > Future considerations)
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When daemon mode is implemented in the CLI, the Docker image needs updates:

1. **Entrypoint**: Default CMD should switch from `sync` to `daemon` (or support both via env var like `PODKIT_MODE=daemon`)
2. **Process supervision**: Consider adopting s6-overlay for long-running container process management (restart on crash, graceful shutdown)
3. **Health check**: Add a `HEALTHCHECK` instruction or s6 health check so Docker orchestration knows the daemon is healthy
4. **USB auto-detect**: Document and support `--privileged` or `--device /dev/bus/usb` for USB device passthrough. May need udev rules inside the container for iPod connect/disconnect events
5. **Restart policy**: Update docker-compose examples with `restart: unless-stopped`

This task is blocked until the daemon mode CLI feature is implemented.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Container runs as a long-lived daemon that auto-syncs on iPod connection
- [ ] #2 Health check endpoint or command exists for orchestration
- [ ] #3 USB device passthrough is documented and tested
- [ ] #4 Container restarts gracefully after crashes
<!-- AC:END -->
