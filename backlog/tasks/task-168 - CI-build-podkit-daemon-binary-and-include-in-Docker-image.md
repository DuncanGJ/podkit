---
id: TASK-168
title: 'CI: build podkit-daemon binary and include in Docker image'
status: To Do
assignee: []
created_date: '2026-03-19 15:59'
labels:
  - ci
  - daemon
  - docker
dependencies: []
references:
  - .github/workflows/release.yml
  - .github/workflows/docker.yml
  - packages/podkit-daemon/package.json
  - docker/Dockerfile
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The daemon binary (`podkit-daemon`) is not built by CI. The Dockerfile expects `bin/${TARGETARCH}/podkit-daemon` but the release workflow only builds the `podkit` CLI binary. Users pulling the Docker image from GHCR won't have the daemon binary.

### What's needed

1. **Release workflow** (`.github/workflows/release.yml`): build `podkit-daemon` alongside `podkit` for all 4 platform targets (linux-x64, linux-arm64, darwin-x64, darwin-arm64). The daemon uses `bun build --compile` (see `packages/podkit-daemon/package.json` compile script).

2. **Docker workflow** (`.github/workflows/docker.yml`): ensure the musl-linked daemon binary is copied into the Docker image. The Dockerfile already has the COPY instruction (`bin/${TARGETARCH}/podkit-daemon`).

3. **turbo.json**: wire the daemon's build/compile tasks into the monorepo pipeline if not already.

4. **`/sys` access in Docker**: verify that `/sys/block/<device>/device/` symlinks resolve correctly inside the container for USB vendor ID detection. Document findings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Release workflow builds podkit-daemon binary for all platform targets
- [ ] #2 Docker image includes both podkit and podkit-daemon binaries
- [ ] #3 docker run ghcr.io/jvgomg/podkit daemon starts successfully
- [ ] #4 turbo.json includes podkit-daemon build tasks
<!-- AC:END -->
