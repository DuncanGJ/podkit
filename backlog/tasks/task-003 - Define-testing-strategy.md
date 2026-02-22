---
id: TASK-003
title: Define testing strategy
status: To Do
assignee: []
created_date: '2026-02-22 18:32'
labels: []
milestone: 'M0: Project Bootstrap'
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Discuss and document the testing approach for podkit:

**Topics to cover:**
- Unit testing framework (Bun test runner)
- Integration testing approach (mocking vs real dependencies)
- How to test libgpod bindings without physical iPod
- Test iPod image creation for CI
- Coverage requirements
- Test organization (co-located vs separate test directories)

**Outcome:** Create an ADR or docs/TESTING.md documenting the decisions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Testing approach discussed with user
- [ ] #2 ADR or TESTING.md created documenting decisions
- [ ] #3 Basic test setup working in at least one package
<!-- AC:END -->
