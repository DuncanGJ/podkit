---
id: TASK-143
title: Add Docker Hub as secondary container registry
status: To Do
assignee: []
created_date: '2026-03-17 20:50'
labels:
  - docker
  - ci
  - distribution
dependencies: []
references:
  - .github/workflows/docker.yml
  - docker/Dockerfile
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add Docker Hub publishing alongside GHCR in the Docker CI workflow. This requires:

1. Add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets
2. Add a second `docker/login-action` step in `.github/workflows/docker.yml` for Docker Hub
3. Add Docker Hub tags to the `docker/build-push-action` step (e.g., `jvgomg/podkit:latest`, `jvgomg/podkit:x.y.z`)

The GHCR workflow is already in place — this is purely additive.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Docker image is pushed to both GHCR and Docker Hub on release
- [ ] #2 Docker Hub tags match GHCR tags (latest, x.y.z, x.y)
- [ ] #3 DOCKERHUB_USERNAME and DOCKERHUB_TOKEN secrets are documented
<!-- AC:END -->
