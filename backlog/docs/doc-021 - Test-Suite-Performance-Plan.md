---
id: doc-021
title: Test Suite Performance Plan
type: other
created_date: '2026-03-23 20:33'
---
# Test Suite Performance Plan

## Current State

Total wall-clock time: **~70s** (turborepo parallelism), **~230s** aggregate across packages.

| Package | Type | Tests | Duration | Bottleneck |
|---------|------|-------|----------|------------|
| libgpod-node | integration | 285 | **160s** | 242 × `withTestIpod` subprocess spawns |
| podkit-core | unit | 2,057 | 29s | Pure logic — acceptable |
| podkit-core | integration | 162 | 19.6s | 34 × `withTestIpod` subprocess spawns |
| podkit-cli | integration | 58 | 19.4s | 36 × `withTestIpod` subprocess spawns |
| podkit-daemon | unit | 60 | 272ms | — |
| podkit-cli | unit | 807 | 489ms | — |
| gpod-testing | integration | 15 | 3.3s | 11 × `withTestIpod` (testing itself) |

### The dominant bottleneck: `withTestIpod`

**312 calls** across the suite, each spawning a `gpod-tool init` subprocess (~300ms):

```
withTestIpod() → createTestIpod() → mkdtemp() → spawn('gpod-tool', ['init', ...]) → C program → create dirs + SQLite DB → ~300ms
```

**Estimated subprocess overhead: ~93.6 seconds** (312 × 300ms).

The libgpod-node package is the critical path at 160s. Of that, ~72s is pure subprocess spawning for iPod creation.

### What's NOT a bottleneck

- **podkit-core unit tests (29s)**: 2,057 pure-logic tests with no I/O. ~15ms/test is reasonable.
- **FFmpeg in integration tests**: Minimal — only a few tests in `music-executor.integration.test.ts` generate short audio files.
- **E2E tests**: Run separately (`bun run test:e2e`), not part of the main suite.

---

## Opportunities

### 1. Pre-built iPod database templates ⭐ DO FIRST

**Impact: High | Effort: Small | Saves: ~90s aggregate**

Instead of calling `gpod-tool init` (subprocess) 312 times, pre-build template directories for each iPod model and use `cp -r` to create test instances.

- Generate one template per model used in tests (MA147, MA002, MA477, MB565, MC293, MC027)
- Store in `packages/gpod-testing/templates/` (a few hundred KB total)
- Update `createTestIpod()` to `cp -r` the template instead of spawning `gpod-tool`
- Fall back to `gpod-tool init` for models without a template

**Expected result**: Per-creation cost drops from ~300ms to ~5ms. Total subprocess overhead drops from ~93.6s to ~1.6s.

**Does NOT get superseded** by any later optimisation — even with shared instances, you still want fast creation for the remaining calls.

### 2. Shared iPod instances per test file (libgpod-node)

**Impact: High | Effort: Medium-Large | Saves: additional ~5s after templates, but also improves test clarity**

Refactor the 12 libgpod-node integration test files to create one iPod in `beforeAll` and share it across tests in the same `describe` block, instead of 242 individual `withTestIpod` wrappers.

This requires:
- Auditing each test for isolation (does it mutate state that affects later tests?)
- Adding a `resetDatabase()` or similar mechanism to cheaply reset between tests
- Tests that need a specific model or unusual setup can still use their own instance

After templates are in place, this drops creations from 242 to ~12-20. The time savings after templates is modest (~1s), but the real value is **test clarity and maintainability** — less boilerplate, faster to add new tests.

### 3. Shared iPod instances per test file (podkit-core + podkit-cli)

**Impact: Moderate | Effort: Small-Medium | Saves: additional ~1s after templates**

Same pattern as opportunity 2, applied to:
- `packages/podkit-core/src/**/database.integration.test.ts` (34 calls → ~1)
- `packages/podkit-cli/src/**/device.integration.test.ts` (36 calls → ~1)
- `packages/podkit-cli/src/**/sync.integration.test.ts` (6 calls → ~1)

Smaller scope than libgpod-node since there are fewer files.

### 4. Database reset helper in gpod-testing

**Impact: Enables #2 and #3 | Effort: Small**

Add a `resetDatabase(ipodPath)` function to `@podkit/gpod-testing` that clears all tracks, playlists, and artwork from an existing iPod database without re-creating the directory structure. This is what enables safe iPod sharing between tests.

Could be implemented as:
- A new `gpod-tool reset` command (fast, reuses existing subprocess)
- Or via libgpod-node's `Database` API directly (no subprocess)

### 5. Parallel test file execution within packages

**Impact: Low-Moderate | Effort: Small**

Bun test runner supports parallel file execution. Verify that integration test files are configured to run in parallel (they should be, since each uses isolated temp dirs). If not, enable it.

This is orthogonal to the other optimisations — it reduces wall-clock time by spreading work across CPU cores.

### 6. Inline iPod database creation (TypeScript)

**Impact: High | Effort: Very High | NOT RECOMMENDED**

Replace the `gpod-tool` subprocess with a pure TypeScript iPod database creator. This would eliminate all subprocess overhead entirely.

**Why we're not doing this**: Templates (opportunity 1) achieve 95%+ of the benefit at 5% of the effort. The iTunesDB format is complex and already well-handled by `gpod-tool`. Building a TS reimplementation just for test setup is not justified.

**Exception**: If the `ipod-db` milestone (libgpod replacement) progresses, this becomes free as a side-effect.

---

## Recommended execution order

```
Phase 1 (foundation):
  [1] iPod database templates        — small effort, unlocks biggest speed gain
  [4] Database reset helper           — small effort, enables phase 2

Phase 2 (refactor):
  [2] Shared instances: libgpod-node  — medium-large effort, biggest test file
  [3] Shared instances: core + cli    — small-medium effort

Phase 3 (polish):
  [5] Verify parallel execution       — small effort, marginal gains
```

Phase 1 alone should cut the `bun run test` wall time from ~70s to ~30-35s. Phase 2 adds clarity more than speed at that point.

---

## Expected outcomes

| Metric | Before | After Phase 1 | After Phase 2 |
|--------|--------|---------------|---------------|
| libgpod-node integration | 160s | ~90s | ~85s |
| podkit-core integration | 19.6s | ~10s | ~9s |
| podkit-cli integration | 19.4s | ~9s | ~8s |
| Total wall clock (`bun run test`) | ~70s | ~35s | ~30s |
| `withTestIpod` subprocess spawns | 312 | 312 (but fast) | ~20 (fast) |
