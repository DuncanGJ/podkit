---
id: doc-017
title: 'PRD: Multi-Segment Artist Extraction (Slash-Delimited Credits)'
type: other
created_date: '2026-03-23 17:23'
---
## Problem Statement

When a track's artist field contains multiple featuring credits separated by `/` (e.g. `"Limp Bizkit feat. Matt Pinfield / Limp Bizkit feat. Les Claypool"`), the clean artists transform treats the entire string after the first `feat.` as a single featured artist. This produces garbled output: the featured text becomes `"Matt Pinfield / Limp Bizkit feat. Les Claypool"`, which contains the main artist name and a second `feat.` token inside what should be a clean featured artist string.

The ideal output would combine the featured artists: `"Outro / Radio Sucks / The Mind of Les (feat. Matt Pinfield & Les Claypool)"`.

## Solution

Add a pre-processing step to the feat extraction logic that detects `/`-delimited segments in the artist field. When found, each segment is processed independently, the main artist is taken from the first segment, and all featured artists across segments are combined with `&`.

## User Stories

1. As a podkit user with medley tracks that have per-segment featuring credits, I want the transform to combine the featured artists into a single clean credit, so the iPod display is readable.
2. As a podkit user, I want the main artist to be extracted from the first segment, so the artist field is clean.
3. As a podkit user, I want featured artists from all segments to be joined with `&`, so no credits are lost.
4. As a podkit user, I want the `/` delimiter in the title field to be unaffected, so medley titles like `"Outro / Radio Sucks / The Mind of Les"` are preserved.
5. As a podkit user, I want `--dry-run` to show the combined featured artist output, so I can verify the result.
6. As a podkit user with tracks that have `/` in the artist field but no featuring tokens (if any exist), I want those tracks to be unaffected, so the pre-processing is safe.

## Implementation Decisions

- The pre-processing step should be added at the beginning of `extractFeaturedArtist` (or as a wrapper around it), before the main regex matching.
- Detection: check if the artist string contains `/`. If so, split into segments on `/` and process each independently.
- For each segment, run the normal explicit feat extraction. Collect the main artist from the first segment and all featured artists from all segments.
- If segments have different main artists (unusual but possible), fall back to the current single-pass behaviour to avoid making incorrect assumptions.
- If no segments contain featuring tokens, fall back to the current single-pass behaviour (the `/` might be part of the artist name).
- The combined featured artists should be joined with ` & ` (space-ampersand-space).
- The `/` split only applies to the artist field, never to the title.
- The ignore list should still be respected within each segment.
- This is a code change in `packages/podkit-core/src/transforms/ftintitle/extract.ts`, not a config change. No new config options are needed.

## Testing Decisions

- Test the multi-segment case: `"A feat. X / A feat. Y"` → main: `"A"`, featured: `"X & Y"`.
- Test mixed segments: `"A feat. X / B feat. Y"` (different main artists) → falls back to single-pass.
- Test no-feat segments: `"A / B"` → falls back to single-pass (no featuring tokens found).
- Test single-segment (no `/`): existing behaviour unchanged.
- Test that `/` in the title field is never affected.
- Test the full pipeline: artist + title → transformed artist + title.
- The existing `ftintitle.test.ts` and `extract.test.ts` files provide the prior art pattern.
- Good tests verify input→output metadata pairs without testing regex internals.

## Out of Scope

- Fixing the source metadata in Navidrome — this PRD is about making the transform handle the pattern gracefully.
- Handling other multi-credit delimiters (e.g. `;`, `,`) — only `/` is addressed here as it's the observed pattern.
- Changes to the ambiguous separator logic (`&`, `and`, `with`) — those are separate concerns.
- The separator-aware formatting feature (covered by its own PRD) — though this feature would benefit from it if `vs.` appeared in a segment.

## Further Notes

- In the current navidrome collection of 2,821 tracks, exactly 1 track has `/` in the artist field: `"Limp Bizkit feat. Matt Pinfield / Limp Bizkit feat. Les Claypool"`. The pre-processing was validated against this track and produces the correct result: `Artist: "Limp Bizkit"`, `Title: "Outro / Radio Sucks / The Mind of Les (feat. Matt Pinfield & Les Claypool)"`.
- The `/` character was checked against all artist fields in the collection — no other tracks use it, so the risk of false positives is zero in the current dataset.
- This is a small, targeted code change with a clear trigger condition (`/` in artist field) and a safe fallback (single-pass behaviour when segments don't have consistent featuring patterns).
- While the source metadata could be fixed, this pattern (per-segment credits in medley tracks) is a known tagging convention and could appear in other collections. Handling it in the transform is a reasonable defensive measure.
