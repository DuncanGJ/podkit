---
id: TASK-213
title: 'Review and plan: Remix-aware artist attribution in clean artists transform'
status: To Do
assignee: []
created_date: '2026-03-23 17:23'
labels:
  - clean-artists
  - transform
  - planning
dependencies: []
documentation:
  - doc-016
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review doc-016 (PRD: Remix-Aware Artist Attribution in Clean Artists Transform) and create an implementation plan.

**Context:** Remix singles tagged as `"Babsy & 1-800 GIRLS"` get the wrong primary artist. The user has 26 tracks by 1-800 GIRLS and 0 by Babsy, so they'd expect to find the track under "1-800 GIRLS". A similar case exists with `"Normal Average People — Refund Taxi (1-800 Girls remix)"` where the artist field is clean but the user would prefer it under the remixer.

The PRD presents two approaches:
- **Approach A:** Collection-aware heuristic ("remix flip") that detects when the right-hand artist has significantly more collection presence
- **Approach B:** Config-level artist overrides for explicit per-track rewrites

**What to do:**
1. Read the PRD (doc-016) thoroughly
2. Decide between Approach A, Approach B, or a combination — document the reasoning
3. If Approach A: design how collection statistics would be passed to the transform pipeline (transforms are currently stateless per-track functions)
4. Consider the Normal Average People case — it requires a broader "artist rewrite" since the artist field is already clean
5. Design how the original artist is preserved in the output (the user explicitly wants Babsy to appear somewhere — not be lost entirely)
6. Consider the interaction with the existing `ignore` list
7. Break into implementation tasks

**Key constraint:** The user wants the original artist preserved in the output, not silently dropped. The user also wants the Normal Average People track to be addressed by the same solution.

**Estimated scope:** Medium-to-large — this may require architectural changes to the transform pipeline if collection-awareness is needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PRD doc-016 has been reviewed and any gaps or concerns are documented
- [ ] #2 A decision is made between Approach A (heuristic), Approach B (config overrides), or a combination, with reasoning documented
- [ ] #3 The Normal Average People case is addressed in the design (not just the Babsy & case)
- [ ] #4 The approach for preserving the original artist in the output is decided
- [ ] #5 Implementation tasks are created with clear scope boundaries
- [ ] #6 The interaction with existing ignore list and other transforms is considered
<!-- AC:END -->
