---
id: TASK-167.05
title: Tab completion for TV/Movies collections and show names
status: To Do
assignee: []
created_date: '2026-03-19 14:47'
labels:
  - cli
milestone: Video Collection Split
dependencies:
  - TASK-167.02
references:
  - doc-007
documentation:
  - packages/podkit-cli/src/commands/completions.ts
parent_task_id: TASK-167
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add dynamic tab completion for the new TV and Movies content types. See PRD: doc-007.

**Collection name completion:**
- New `__complete tv-collections` and `__complete movies-collections` hidden commands
- `__complete collections` updated to include all three types (music, tv, movies)
- Wired to `-c` flag on `collection tv`, `collection movies`, `device tv`, `device movies`

**Show name completion:**
- New `__complete tv-shows` hidden command that scans the default TV collection and returns show names
- Wired to the positional argument on `collection tv` and `device tv`
- Completion generators (zsh + bash) updated to handle positional argument completion

**User stories covered:** 13, 14
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 __complete tv-collections returns TV collection names from config
- [ ] #2 __complete movies-collections returns movie collection names from config
- [ ] #3 __complete collections includes tv and movies alongside music
- [ ] #4 __complete tv-shows scans default TV collection and returns show names
- [ ] #5 zsh completion generator wires show names to positional argument on collection tv
- [ ] #6 bash completion generator wires show names to positional argument on collection tv
- [ ] #7 -c flag completes with tv/movies collection names on relevant commands
<!-- AC:END -->
