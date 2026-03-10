---
id: TASK-097
title: Add link checking and docs CI validation
status: To Do
assignee: []
created_date: '2026-03-10 10:31'
labels:
  - docs-site
  - ci-cd
milestone: Documentation Website v2
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add automated checks to validate documentation quality in CI.

## Scope

1. **Link checking** - Verify no broken internal or external links
2. **Build verification** - Ensure docs build succeeds on PRs
3. **PR previews** (optional) - Consider preview deployments for doc changes

## Tools to consider

- `lychee` for link checking
- Astro's built-in build validation
- GitHub Actions workflow additions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Broken link detection in CI
- [ ] #2 Docs build verified on PRs
- [ ] #3 Clear error reporting for failures
<!-- AC:END -->
