---
id: TASK-212
title: 'Review and plan: Separator-aware formatting in clean artists transform'
status: To Do
assignee: []
created_date: '2026-03-23 17:23'
labels:
  - clean-artists
  - transform
  - planning
dependencies: []
documentation:
  - doc-015
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review doc-015 (PRD: Separator-Aware Formatting in Clean Artists Transform) and create an implementation plan.

**Context:** The clean artists transform currently applies a single format string (`"feat. {}"`) to all extractions regardless of which separator token was matched. When `vs.` is matched (e.g. `"Crystal Castles vs. HEALTH"`), the output should use `"vs. {}"` formatting instead of `"feat. {}"` to preserve the collaboration style.

**What to do:**
1. Read the PRD (doc-015) thoroughly
2. Review the current implementation in `packages/podkit-core/src/transforms/ftintitle/` — specifically `extract.ts`, `patterns.ts`, and the types in `../types.ts`
3. Design the changes to `ExtractResult` to include separator kind information
4. Plan the config schema addition (`vsFormat` field)
5. Identify all test files that need updating
6. Break this into implementation tasks if the scope warrants it, or mark this task as the implementation task if it's small enough

**Key files:** `extract.ts` (ExtractResult type, extractFeaturedArtist), `patterns.ts` (token lists), `types.ts` (CleanArtistsConfig), `ftintitle.test.ts`

**Estimated scope:** Small — this is a targeted change to pass separator info through the extraction pipeline and choose the format string accordingly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PRD doc-015 has been reviewed and any gaps or concerns are documented
- [ ] #2 Implementation approach is decided (single task or broken into subtasks)
- [ ] #3 If subtasks are needed, they are created with clear scope boundaries
- [ ] #4 The interaction with existing `ignore` list behaviour is verified as unaffected
<!-- AC:END -->
