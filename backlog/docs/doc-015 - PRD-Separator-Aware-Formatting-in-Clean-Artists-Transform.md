---
id: doc-015
title: 'PRD: Separator-Aware Formatting in Clean Artists Transform'
type: other
created_date: '2026-03-23 17:22'
---
## Problem Statement

The clean artists transform currently applies a single format string (e.g. `"feat. {}"`) to all featured artist extractions, regardless of which separator token was matched in the source artist field. This means a track tagged as `"Crystal Castles vs. HEALTH"` is transformed to `"Crimewave (feat. HEALTH)"`, which misrepresents the collaboration style. `vs.` implies a co-equal collaboration or mashup, not a guest appearance — and users expect the iPod display to reflect that distinction.

More broadly, the transform has several categories of separator tokens — explicit (`feat.`, `ft.`, `featuring`), and ambiguous (`vs.`, `vs`, `&`, `and`, `with`, `con`) — but collapses them all into the same output format. This loses semantic information that was present in the source metadata.

## Solution

Extend the clean artists transform to be aware of which separator token triggered the match, and allow different output formats for different token categories. When a `vs.`/`vs` token is matched, the title should use `"vs. {}"` formatting rather than `"feat. {}"`. This preserves the original collaboration style while still achieving the primary goal of cleaning the artist field.

## User Stories

1. As a podkit user with tracks tagged `"Artist A vs. Artist B"`, I want the iPod title to say `"Song (vs. Artist B)"`, so that the collaboration style is preserved.
2. As a podkit user, I want `feat.`/`ft.`/`featuring` tokens to continue using my configured format string, so that my existing configuration is unchanged.
3. As a podkit user, I want `vs.`/`vs` tokens to automatically use `"vs. {}"` formatting without needing to configure anything, so that it works correctly by default.
4. As a podkit user, I want the option to override the `vs.` format string in my config, so that I can customise it (e.g. `"vs {}"` without the period).
5. As a podkit user, I want to see which separator was matched in `--dry-run` output, so I can verify the transform is doing the right thing.
6. As a podkit user, I want `&`/`and`/`with` tokens to continue using the configured `feat.` format, so that genuine featuring credits via these tokens are handled correctly.

## Implementation Decisions

- The `extractFeaturedArtist` function should return the matched separator token (or token category) alongside the `mainArtist` and `featuredArtist`.
- The `ExtractResult` type should be extended with a field like `separatorKind: 'explicit' | 'vs' | 'ambiguous'` (or the raw matched token string).
- The `applyFtInTitle` function should accept the separator information and choose the appropriate format string.
- The `CleanArtistsConfig` type should gain an optional `vsFormat` field (default: `"vs. {}"`). The existing `format` field continues to control explicit and ambiguous matches.
- The `insertFeatIntoTitle` function does not need to change — it already accepts a format string parameter.
- The transform pipeline and config loader need minor updates to pass through the new `vsFormat` config value.
- The TOML config surface would look like:
  ```toml
  [cleanArtists]
  format = "feat. {}"    # existing
  vsFormat = "vs. {}"    # new, optional
  ```

## Testing Decisions

- Unit tests should cover the `extractFeaturedArtist` function returning the correct separator kind for each token category.
- Unit tests should cover `applyFtInTitle` choosing the correct format string based on separator kind.
- Integration tests should verify end-to-end transform output for `vs.` tracks.
- The existing ftintitle test suite (`packages/podkit-core/src/transforms/ftintitle/ftintitle.test.ts`) provides the prior art pattern for these tests.
- Good tests here exercise the public interface (input artist + title → output artist + title) rather than testing regex internals.

## Out of Scope

- Changing which tokens are in the explicit vs. ambiguous lists (that's a separate concern).
- Adding new separator categories beyond `vs.` (e.g. a hypothetical `"remix"` category — that's covered by the remix flip PRD).
- Collection-aware logic — this PRD is purely about formatting based on the matched token.

## Further Notes

- In the current navidrome collection of 2,821 tracks, exactly 1 track matches `vs.` (`Crystal Castles vs. HEALTH`). The feature is low frequency but the principle is sound and prevents needing an ignore rule workaround.
- The Coheed and Cambria ignore rule is unrelated to this change and should continue to work as-is.
- This is a backward-compatible change — the default `vsFormat` produces different output than before for `vs.` matches, but this is a correction, not a regression. No config migration is needed.
