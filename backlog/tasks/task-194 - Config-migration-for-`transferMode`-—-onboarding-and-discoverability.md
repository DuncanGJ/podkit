---
id: TASK-194
title: Config migration for `transferMode` — onboarding and discoverability
status: To Do
assignee: []
created_date: '2026-03-23 12:03'
updated_date: '2026-03-23 14:36'
labels:
  - config
  - ux
  - onboarding
dependencies:
  - TASK-202
references:
  - packages/podkit-cli/src/commands/init.ts
  - packages/podkit-cli/src/config/loader.ts
  - agents/config-migrations.md
  - docs/user-guide/configuration.md
documentation:
  - backlog/docs/doc-011 - PRD--Transfer-Mode.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The `transferMode` option (renamed from `fileMode`) is a new config field with a sensible default (`fast`). No config migration is strictly required — existing configs work without it. However, users won't know about the option unless they read changelogs or docs.

**Important:** This task depends on the Transfer Mode: iPod Support milestone (TASK-202) being completed first, since the rename from `fileMode` → `transferMode` and the addition of the `fast` tier happen there. The changeset from TASK-202 will include a changelog note recommending full resync, but this task addresses the broader discoverability and onboarding story.

**Migration considerations:**
- Users who had `fileMode` in their config will get a validation error after upgrading (unrecognized field). The changelog from TASK-202 covers this, but a config migration that automatically renames `fileMode` → `transferMode` and maps old values would be a better UX if podkit gains real users before 1.0.
- Old `fileMode: 'optimized'` maps to new `transferMode: 'fast'` (the old default behavior). Old `fileMode: 'portable'` maps to `transferMode: 'portable'` (unchanged).
- If automated migration is added, it should follow the existing migration framework in `agents/config-migrations.md`.

**Goal:** Help existing and new users discover and configure `transferMode` without making it a breaking change. This is about discoverability and onboarding, not backwards compatibility.

**Questions to resolve (HITL):**

1. **Config init (`podkit init`)** — Should `transferMode` be included in the generated config template? If so, should it be commented out (showing the default) or active? The current init generates a minimal config; adding every option risks overwhelming new users.

2. **Onboarding wizard concept** — Should `podkit init` evolve into a guided wizard that asks users about their use case and configures options accordingly? For example: "Do you want to optimize for speed, storage, or file portability?" → maps to fast/optimized/portable. This is a bigger design question that goes beyond `transferMode` but this feature is a good forcing function.

3. **Upgrade nudge** — When a user upgrades podkit and runs sync, should there be a one-time tip or notice about new config options? Something like "New in vX.Y: transferMode option lets you control how files are prepared for your device. See docs." This could be a general mechanism for surfacing new features.

4. **Automated config migration** — Should we add a migration that renames `fileMode` → `transferMode` and maps `optimized` → `fast`? This matters more if podkit has real users by the time this ships. For now, the changelog warning from TASK-202 is sufficient.

5. **Documentation path** — Is the current approach (docs + changelog + tip when mismatch detected) sufficient for discoverability, or do we need more?

**Context:** The `fast` default matches the pre-feature behavior (artwork was stripped during transcodes, copies were byte-for-byte). So existing users see no change. But users who WANT portable files or optimized storage won't know the option exists unless we surface it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Decision on whether/how to surface transferMode in `podkit init`
- [ ] #2 Decision on onboarding wizard direction (scope beyond just transferMode)
- [ ] #3 Decision on upgrade nudge mechanism for new config options
- [ ] #4 Decision on automated config migration from fileMode → transferMode
- [ ] #5 Implementation of chosen approach for transferMode discoverability
<!-- AC:END -->
