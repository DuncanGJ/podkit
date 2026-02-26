---
id: TASK-058
title: Improve CLI command clarity (status/list ambiguity)
status: To Do
assignee: []
created_date: '2026-02-26 11:37'
labels:
  - ux
  - cli
  - e2e-finding
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**UX issues found in E2E testing (TASK-029)**

Current commands are ambiguous about what they operate on:
- `podkit status` - unclear it shows iPod status
- `podkit list` - unclear what it's listing (iPod vs local)

**Options to consider:**

1. **Subcommand approach:**
   ```
   podkit ipod status
   podkit ipod list
   podkit local list
   podkit sync  # syncs local → ipod
   ```

2. **Flag approach:**
   ```
   podkit list --ipod (default)
   podkit list --local
   podkit status  # always iPod
   ```

3. **Clearer output headers:**
   Keep commands as-is but add clear headers:
   ```
   === iPod Status ===
   === iPod Tracks ===
   === Local Collection ===
   ```

**Recommendation:** Option 1 or 3. Discuss with user before implementing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Commands clearly indicate what they operate on
- [ ] #2 User knows if viewing iPod or local collection
- [ ] #3 Consistent mental model across commands
<!-- AC:END -->
