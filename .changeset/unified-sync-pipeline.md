---
"@podkit/core": minor
"podkit": minor
---

Unify sync pipeline with ContentTypeHandler pattern

- Add generic `ContentTypeHandler<TSource, TDevice>` interface for media-type-specific sync logic
- Add `MusicHandler` and `VideoHandler` implementations
- Add `UnifiedDiffer`, `UnifiedPlanner`, and `UnifiedExecutor` generic pipeline components
- Add shared error categorization and retry logic (`error-handling.ts`)
- Add handler registry for looking up handlers by type string
- Video sync now routes through the unified pipeline in the CLI
- Video executor supports self-healing upgrades (preset-change, metadata-correction)
- Video executor categorizes errors and supports configurable per-category retries
- Fix album artwork cache incorrectly sharing artwork between tracks with and without artwork
- Generic `CollectionAdapter<TItem, TFilter>` interface replaces separate music/video adapter contracts
