---
id: TASK-214
title: 'Review and plan: Multi-segment artist extraction (slash-delimited credits)'
status: To Do
assignee: []
created_date: '2026-03-23 17:24'
labels:
  - clean-artists
  - transform
  - planning
dependencies: []
documentation:
  - doc-017
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review doc-017 (PRD: Multi-Segment Artist Extraction) and create an implementation plan.

**Context:** The track `"Limp Bizkit feat. Matt Pinfield / Limp Bizkit feat. Les Claypool"` produces garbled output because the regex treats everything after the first `feat.` as the featured artist string. A pre-processing step that splits on `/` before extraction would produce the correct result: `Artist: "Limp Bizkit"`, `Featured: "Matt Pinfield & Les Claypool"`.

**What to do:**
1. Read the PRD (doc-017) thoroughly
2. Review the current `extractFeaturedArtist` function in `extract.ts`
3. Design where the `/` pre-processing step should live (inside `extractFeaturedArtist` or as a wrapper)
4. Define the fallback behaviour for edge cases (different main artists across segments, no feat tokens in segments)
5. Identify test cases
6. This is likely small enough to be a single implementation task — confirm or break into subtasks

**Key files:** `packages/podkit-core/src/transforms/ftintitle/extract.ts`, `ftintitle.test.ts`

**Estimated scope:** Small — a targeted pre-processing step with clear trigger conditions and safe fallbacks. Only 1 track in the current collection is affected, but the pattern is a known tagging convention.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PRD doc-017 has been reviewed and any gaps or concerns are documented
- [ ] #2 Implementation approach is decided (single task or broken into subtasks)
- [ ] #3 Fallback behaviour for edge cases is clearly defined
- [ ] #4 The interaction with the ignore list within segments is considered
- [ ] #5 If subtasks are needed, they are created with clear scope boundaries
<!-- AC:END -->
