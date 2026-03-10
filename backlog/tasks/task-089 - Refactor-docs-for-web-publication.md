---
id: TASK-089
title: Refactor docs/ for web publication
status: To Do
assignee: []
created_date: '2026-03-10 10:26'
labels:
  - docs-site
  - documentation
milestone: Documentation Website v1
dependencies:
  - TASK-087
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reorganize and enhance the existing documentation in `docs/` to be suitable for web publication via Starlight.

## Scope

1. **File organization**
   - Rename files for web-friendly URLs (lowercase, hyphens)
   - Organize into subdirectories matching navigation structure
   - Consider: `guides/`, `reference/`, `developer/`

2. **Add frontmatter to all docs**
   - Title, description
   - Sidebar position/ordering
   - Any Starlight-specific frontmatter

3. **Update AGENTS.md**
   - Add directives about maintaining frontmatter when editing docs
   - Document the docs/ structure and conventions
   - Guidance on adding new documentation

4. **Content assessment**
   - Review each document for web-readability
   - Identify content that needs rewriting (can be addressed in TASK-090/091)
   - Ensure internal links work with new structure

## Approach

This is a complex task that requires judgment about organization. The developer should:
1. Review the design/IA from TASK-087
2. Propose a file structure and discuss before implementing
3. Create the plan/acceptance criteria refinements based on discussion
4. Implement the reorganization
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All docs have valid frontmatter
- [ ] #2 Files organized in web-friendly structure
- [ ] #3 AGENTS.md updated with docs maintenance guidance
- [ ] #4 Existing docs render correctly in Starlight
<!-- AC:END -->
