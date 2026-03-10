---
id: TASK-101
title: Set up npm publishing with changesets and prebuilt binaries
status: To Do
assignee: []
created_date: '2026-03-10 16:08'
labels:
  - dx
  - packaging
  - ci
dependencies:
  - TASK-100
references:
  - packages/libgpod-node/package.json
  - .github/workflows/prebuild.yml
  - TASK-100
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Goal

Set up automated npm publishing using [changesets](https://github.com/changesets/changesets) with the [changesets GitHub Action](https://github.com/changesets/action). The publish pipeline must include prebuilt native binaries from the prebuild CI workflow (TASK-100) so that `npm install @podkit/libgpod-node` works without any native build tools.

## Context

TASK-100 adds a GitHub Actions workflow (`prebuild.yml`) that builds statically-linked `.node` binaries for darwin-x64, darwin-arm64, and linux-x64 using prebuildify. These are uploaded as workflow artifacts. This task needs to integrate those artifacts into the npm publish flow.

## Implementation Approach

### 1. Install and configure changesets

```bash
bun add -D @changesets/cli @changesets/changelog-github
```

Initialize changesets config (`.changeset/config.json`), configure for the monorepo.

### 2. Create a release workflow

Create `.github/workflows/release.yml` that:

1. Triggers on push to `main`
2. Uses `changesets/action` to either:
   - Open a "Version Packages" PR (when changesets are pending), or
   - Publish to npm (when the version PR is merged)
3. Before publishing, triggers the `prebuild.yml` workflow and downloads the combined prebuilds artifact
4. Places prebuilds into `packages/libgpod-node/prebuilds/` before `npm publish`

### 3. Workflow coordination

The release workflow needs the prebuilds from `prebuild.yml`. Options:
- **workflow_call**: Make `prebuild.yml` callable as a reusable workflow from the release workflow
- **workflow_dispatch + wait**: Trigger prebuild and poll for completion
- **Build inline**: Include the prebuild matrix directly in the release workflow

Recommended: Make `prebuild.yml` a reusable workflow (`workflow_call`) that the release workflow calls before publishing.

### 4. Publish script

The changesets action calls a publish command. Create a script that:
1. Downloads/verifies prebuilds are in place
2. Runs `bun run build` (TypeScript compilation)
3. Runs `changeset publish`

## Reference

- [changesets GitHub Action](https://github.com/changesets/action)
- [changesets docs](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
- prebuild workflow: `.github/workflows/prebuild.yml`
- Package files config: `packages/libgpod-node/package.json` (`files` field includes `prebuilds/`)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 changesets CLI installed and configured for the monorepo
- [ ] #2 Release workflow uses changesets/action to manage version PRs and npm publish
- [ ] #3 Prebuilt native binaries from prebuild.yml are included in the published npm package
- [ ] #4 npm install @podkit/libgpod-node on a clean system (no libgpod) loads the prebuilt binary successfully
- [ ] #5 CHANGELOG.md is auto-generated from changeset entries
<!-- AC:END -->
