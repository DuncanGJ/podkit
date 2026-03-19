---
id: TASK-167.02
title: TV + Movies browsing commands (collection + device)
status: To Do
assignee: []
created_date: '2026-03-19 14:46'
labels:
  - cli
  - video
milestone: Video Collection Split
dependencies:
  - TASK-167.01
references:
  - doc-007
documentation:
  - packages/podkit-cli/src/commands/collection.ts
  - packages/podkit-cli/src/commands/device.ts
  - packages/podkit-cli/src/commands/display-utils.ts
parent_task_id: TASK-167
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Full TV and Movies browsing experience for both collection and device sides. See PRD: doc-007.

**`collection tv` / `device tv`:**
- Default: stats (show count, season count, episode count, file type breakdown)
- Positional argument: fuzzy show name match (case-insensitive substring). Multiple matches show all. No match shows available show names.
- `--season N`: filter to specific season when drilling into a show
- `--episodes`: flat episode list with purpose-built columns (show, season, episode, title, duration, format)
- `--format table|json|csv` and `--fields` (power-user escape hatch)
- `device tv` filters iPod tracks by `MediaType.TVShow`

**`collection movies` / `device movies`:**
- Default: stats (movie count, format breakdown, resolution breakdown)
- `--list`: flat movie list with purpose-built columns (title, year, duration, resolution, format)
- `--sort title|year` (default: title)
- `--format table|json|csv` and `--fields`
- `device movies` filters iPod tracks by `MediaType.Movie`

**Display infrastructure:**
- New types: `TVShowSummary`, `TVEpisodeDisplay`, `TVStats`, `MovieDisplay`, `MovieStats`
- Independent of `DisplayTrack` — no shoehorning video into music shapes
- Table/JSON/CSV formatters extended for new types

**`collection list` updated:**
- Shows TV and movie collections as separate sections alongside music

**User stories covered:** 1, 2, 3, 4, 5, 12, 15, 16, 17, 18, 19, 20, 24, 25
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `collection tv` shows stats: show count, season count, episode count, file types
- [ ] #2 `collection tv "Digimon"` shows all matching shows with season/episode breakdown
- [ ] #3 `collection tv "Digimon" --season 1` shows episodes in season 1
- [ ] #4 `collection tv --episodes` shows flat episode list with show, season, episode, title, duration, format columns
- [ ] #5 Fuzzy match is case-insensitive substring; no match shows available show names
- [ ] #6 `collection movies` shows stats: movie count, format breakdown, resolution breakdown
- [ ] #7 `collection movies --list` shows flat movie list sorted by title
- [ ] #8 `collection movies --list --sort year` sorts by year
- [ ] #9 `device tv` mirrors collection tv using iPod database filtered by MediaType.TVShow
- [ ] #10 `device movies` mirrors collection movies using iPod database filtered by MediaType.Movie
- [ ] #11 `collection list` shows tv and movies collections as separate sections
- [ ] #12 --format json and --format csv work with new field names
- [ ] #13 --fields works as power-user escape hatch with video-appropriate field names
<!-- AC:END -->
