---
id: TASK-209
title: Review `podkit device music` output for transfer mode changes
status: To Do
assignee: []
created_date: '2026-03-23 14:36'
labels:
  - feature
  - cli
  - ux
milestone: 'Transfer Mode: iPod Support'
dependencies:
  - TASK-200
references:
  - packages/podkit-cli/src/commands/device.ts
documentation:
  - backlog/docs/doc-011 - PRD--Transfer-Mode.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The `podkit device music` command lists tracks on the device and can show sync tag details. With the transfer mode changes (new field names, sync tags on all tracks, new operation types), the output format and UX should be reviewed.

**PRD:** DOC-011 (Transfer Mode)

**What's changing:**
- Sync tags now use `transfer=` instead of `mode=`
- All tracks have sync tags (previously only transcoded tracks)
- New `quality=copy` value appears for direct-copy tracks
- The summary view may show transfer mode distribution

**HITL review needed:**
This task requires human review of the output UX. Specifically:

1. **Summary view (`podkit device music`):** Should the summary show transfer mode distribution (e.g., "450 fast, 50 optimized, 10 portable")? Is this useful or noise?

2. **Detailed view (`podkit device music --format json`):** The JSON output will now include sync tag data for all tracks. Is the schema clear? Should `quality: "copy"` be presented differently?

3. **Filtering:** Should users be able to filter by transfer mode (e.g., `podkit device music --transfer-mode optimized`)? This could help users identify which tracks would be affected by `--force-transfer-mode`.

4. **Table/list format:** If there's a tabular output mode, should transfer mode be a visible column? Or is it too niche?

The implementation should be straightforward once the UX decisions are made.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 HITL: UX review of summary view — decision on whether to show transfer mode distribution
- [ ] #2 HITL: UX review of detailed/JSON output — decision on schema for copy-format sync tags
- [ ] #3 HITL: Decision on whether to add --transfer-mode filter to device music command
- [ ] #4 Output correctly displays transfer= field instead of mode= in sync tag details
- [ ] #5 quality=copy tracks displayed appropriately in all output formats
- [ ] #6 Tests updated for new sync tag format in device music output
<!-- AC:END -->
