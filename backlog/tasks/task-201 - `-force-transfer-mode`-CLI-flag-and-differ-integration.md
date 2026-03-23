---
id: TASK-201
title: '`--force-transfer-mode` CLI flag and differ integration'
status: To Do
assignee: []
created_date: '2026-03-23 14:09'
labels:
  - feature
  - cli
  - sync
milestone: 'Transfer Mode: iPod Support'
dependencies:
  - TASK-196
  - TASK-197
  - TASK-200
references:
  - packages/podkit-core/src/sync/music-differ.ts
  - packages/podkit-core/src/sync/upgrades.ts
  - packages/podkit-cli/src/commands/sync.ts
  - packages/podkit-cli/src/output/tips.ts
  - packages/podkit-cli/src/commands/music-presenter.ts
documentation:
  - backlog/docs/doc-014 - Spec--Operation-Types-&-Sync-Tags.md
  - backlog/docs/doc-011 - PRD--Transfer-Mode.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the `--force-transfer-mode` flag that selectively re-processes tracks whose sync tag `transfer` field doesn't match the current `transferMode` setting. This is the targeted alternative to `--force-transcode` — it only touches mismatched tracks, including copy-format files.

**PRD:** DOC-011 (Transfer Mode)
**Spec:** DOC-014 (Operation Types & Sync Tags)

**CLI flag:**
- `--force-transfer-mode` on the sync command
- Config file: `forceTransferMode: boolean`
- Env var: `PODKIT_FORCE_TRANSFER_MODE`

**Differ changes:**
When `forceTransferMode` is enabled, the differ adds a new check for each matched/existing track:
1. Parse sync tag from iPod track comment
2. Extract transfer mode: `syncTag.transferMode ?? 'fast'` (legacy default)
3. If `transferMode !== config.effectiveTransferMode` → move to `toUpdate` with reason `'transfer-mode-changed'`

**New upgrade reason:**
- `'transfer-mode-changed'` added to `UpgradeReason` union type
- It is a file-replacement upgrade — the planner routes it through standard add logic to determine `upgrade-transcode`, `upgrade-optimized-copy`, or `upgrade-direct-copy`

**Interaction with --force-transcode:**
- `--force-transcode` re-processes all lossless-source tracks (does NOT affect copy-format tracks)
- `--force-transfer-mode` re-processes tracks with mismatched transfer mode (DOES affect copy-format tracks)
- Using both: each track processed once (planner collapses duplicate reasons)

**Tip update:**
- Rename `FILE_MODE_MISMATCH_TIP` → `TRANSFER_MODE_MISMATCH_TIP`
- Update message to recommend `--force-transfer-mode`
- Update `collectPostDiffData()` to use `transferMode` instead of `fileMode`
- Legacy sync tags (missing `transfer` field) treated as `transfer=fast`

**Shell completions:**
- Add `--force-transfer-mode` to shell completion definitions
- Remove old `--file-mode` completions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 --force-transfer-mode CLI flag accepted by sync command
- [ ] #2 forceTransferMode config option and PODKIT_FORCE_TRANSFER_MODE env var supported
- [ ] #3 Differ detects transfer mode mismatch by comparing sync tag transfer field to current config
- [ ] #4 Only tracks with mismatched transfer mode are moved to toUpdate (not all tracks)
- [ ] #5 transfer-mode-changed upgrade reason added and recognized as file-replacement upgrade
- [ ] #6 Copy-format tracks (MP3, M4A) are re-processed when transfer mode changes (unlike --force-transcode which skips them)
- [ ] #7 --force-transcode and --force-transfer-mode can be used together without duplicate processing
- [ ] #8 TRANSFER_MODE_MISMATCH_TIP fires with correct count and recommends --force-transfer-mode
- [ ] #9 Legacy sync tags (missing transfer field) treated as transfer=fast to avoid false positives
- [ ] #10 Shell completions updated with --force-transfer-mode, old --file-mode removed
- [ ] #11 Tests cover mismatch detection, interaction with --force-transcode, and tip firing
<!-- AC:END -->
