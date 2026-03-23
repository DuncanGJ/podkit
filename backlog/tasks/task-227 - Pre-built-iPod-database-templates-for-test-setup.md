---
id: TASK-227
title: Pre-built iPod database templates for test setup
status: To Do
assignee: []
created_date: '2026-03-23 20:33'
labels:
  - testing
  - performance
milestone: "Test Suite Performance"
dependencies: []
documentation:
  - backlog/documents/doc-021 - Test Suite Performance Plan.md
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the per-test `gpod-tool init` subprocess spawn (~300ms each) with pre-built template directories that are copied via `cp -r` (~5ms each).

## Context

Every call to `createTestIpod()` in `@podkit/gpod-testing` spawns a `gpod-tool init` subprocess to create an iPod directory structure and database. This happens **312 times** across the test suite, costing ~93.6 seconds of aggregate subprocess overhead. This is the single largest bottleneck in the test suite.

## Approach

1. **Generate template directories** for each iPod model used in tests: MA147, MA002, MA477, MB565, MC293, MC027. Run `gpod-tool init` once per model and commit the resulting directory structures to `packages/gpod-testing/templates/`.

2. **Update `createTestIpod()`** in `packages/gpod-testing/src/test-ipod.ts` to check for a matching template before falling back to `gpod-tool init`. When a template exists, use `cp -r` (via `fs.cp` with `recursive: true`) to copy it to a fresh temp directory.

3. **Add a generation script** (e.g. `generate-templates.ts`) that rebuilds the templates from `gpod-tool` so they can be regenerated if the database format changes.

4. **Verify all existing tests pass** without modification — this should be a transparent optimisation.

## Key files

- `packages/gpod-testing/src/test-ipod.ts` — `createTestIpod()` function to modify
- `packages/gpod-testing/src/gpod-tool.ts` — `init()` function (current subprocess approach)

## Reference

See doc-021 (Test Suite Performance Plan) for the full analysis.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 createTestIpod() uses cp -r from a template directory when one exists for the requested model
- [ ] #2 Falls back to gpod-tool init for models without a pre-built template
- [ ] #3 Templates exist for all 6 models used in tests (MA147, MA002, MA477, MB565, MC293, MC027)
- [ ] #4 A generation script exists to rebuild templates from gpod-tool
- [ ] #5 All existing tests pass without modification
- [ ] #6 Per-creation time is under 20ms (measured in gpod-testing integration tests)
<!-- AC:END -->
