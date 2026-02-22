---
id: TASK-034
title: Implement podkit list command
status: To Do
assignee: []
created_date: '2026-02-22 22:16'
updated_date: '2026-02-22 22:16'
labels: []
milestone: 'M2: Core Sync (v0.2.0)'
dependencies:
  - TASK-006
  - TASK-009
  - TASK-015
  - TASK-032
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the `podkit list` command that lists tracks on iPod or in a collection.

**Default behavior (no options):**
- Lists tracks from connected iPod
- Uses `--device` global option or auto-detects

**Options:**
- `--source <path>` - list from collection directory instead of iPod
- `--format <fmt>` - output format: table (default), json, csv
- `--fields <list>` - comma-separated fields to show (title, artist, album, duration, etc.)

**Output formats:**
- `table` - human-readable columns
- `json` - array of track objects
- `csv` - comma-separated with header row

**Example output (table):**
```
Title                Artist              Album               Duration
────────────────────────────────────────────────────────────────────────
Bohemian Rhapsody    Queen               A Night at...       5:55
Another One...       Queen               The Game            3:36
```

**Dependencies:**
- Needs libgpod-node for reading iPod tracks
- Needs collection adapter for reading source directory
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lists tracks from iPod by default
- [ ] #2 Lists tracks from --source directory
- [ ] #3 Table format is readable and aligned
- [ ] #4 JSON format outputs valid JSON array
- [ ] #5 CSV format includes header row
- [ ] #6 --fields filters displayed columns
- [ ] #7 Global --device option is respected
<!-- AC:END -->
