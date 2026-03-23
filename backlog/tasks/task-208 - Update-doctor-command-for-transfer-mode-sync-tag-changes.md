---
id: TASK-208
title: Update doctor command for transfer mode sync tag changes
status: To Do
assignee: []
created_date: '2026-03-23 14:35'
labels:
  - feature
  - cli
  - diagnostics
milestone: 'Transfer Mode: iPod Support'
dependencies:
  - TASK-200
references:
  - packages/podkit-core/src/diagnostics/
  - packages/podkit-cli/src/commands/doctor.ts
documentation:
  - backlog/docs/doc-014 - Spec--Operation-Types-&-Sync-Tags.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The doctor command validates sync tag health and reports orphans. With the transfer mode changes — new `transfer=` field, `quality=copy` for direct-copy tracks, and sync tags on all track types — the doctor's validation logic needs updating.

**PRD:** DOC-011 (Transfer Mode)
**Spec:** DOC-014 (Operation Types & Sync Tags)

**Changes needed:**

1. **Sync tag validation:** The doctor parses sync tags to check health. It needs to recognize:
   - `transfer=fast|optimized|portable` as valid (replaces `mode=optimized|portable`)
   - `quality=copy` as a valid quality value for direct-copy tracks
   - Copy-format sync tags with fewer fields (no `encoding`/`bitrate`) as valid

2. **Orphan reporting:** With sync tags now on all tracks (including copies), the orphan detection may need adjustment. Previously, tracks without sync tags were expected (copy-format tracks). Now, a track without a sync tag might be a genuine orphan or a track synced before the transfer mode feature.

3. **Diagnostics output:** If the doctor reports sync tag statistics (e.g., "X tracks with sync tags, Y without"), these numbers will change dramatically since all tracks now have sync tags.

4. **Any existing fileMode references:** Search doctor/diagnostics code for `fileMode` or `mode` references and update to `transferMode`/`transfer`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Doctor validates transfer= field as valid in sync tags
- [ ] #2 Doctor recognizes quality=copy as valid for direct-copy tracks
- [ ] #3 Doctor handles copy-format sync tags (no encoding/bitrate) without false warnings
- [ ] #4 Orphan detection accounts for all tracks now having sync tags
- [ ] #5 Any fileMode/mode references in diagnostics code updated to transferMode/transfer
- [ ] #6 Tests cover doctor validation with new sync tag format
<!-- AC:END -->
