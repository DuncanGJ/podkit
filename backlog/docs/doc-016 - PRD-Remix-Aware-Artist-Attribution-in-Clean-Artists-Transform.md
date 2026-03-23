---
id: doc-016
title: 'PRD: Remix-Aware Artist Attribution in Clean Artists Transform'
type: other
created_date: '2026-03-23 17:23'
---
## Problem Statement

When a remix single is tagged with the original artist and remixer joined by `&` in the artist field (e.g. `"Babsy & 1-800 GIRLS"` for `"The Middle - 1-800 Girls Remix"`), the clean artists transform splits on `&` and treats the left-hand artist as the primary. This produces incorrect results in two ways:

1. **Wrong primary artist.** The user may care more about the remixer than the original artist. In a real collection, the user has 26 tracks by 1-800 GIRLS and 0 by Babsy — they'd expect to find this track under "1-800 GIRLS" in the iPod artist list.
2. **Redundant featuring text.** The remixer name already appears in the title ("1-800 Girls Remix"), so appending "(feat. 1-800 GIRLS)" is redundant and looks messy.

A similar pattern exists with `"Normal Average People — Refund Taxi (1-800 Girls remix)"`. In that case the artist field is clean (`"Normal Average People"`), so the transform doesn't touch it — but the user would still prefer to find it under the remixer's name if the remixer is the artist they care about.

Both cases reflect the same underlying issue: remix singles where the user's relationship is primarily with the remixer, not the original artist.

## Solution

Provide a mechanism for remix tracks to have their artist attribution adjusted. There are two approaches that should be explored and a decision made between them (or a combination):

### Approach A: Collection-Aware Smart Splitting (Heuristic)

A "remix flip" heuristic that detects when an ambiguous `&` split produces the wrong primary artist for a remix track. The heuristic would fire when:

1. The artist field contains an ambiguous separator (`&`)
2. The title or album contains "remix" (case-insensitive)
3. The right-hand artist (Artist B) has significantly more tracks in the collection than the left-hand artist (Artist A) — e.g. B > 0 and A == 0, or B > 5× A

When triggered, the transform flips the attribution: Artist B becomes the primary, and Artist A is preserved somewhere in the output (appended to artist field, included in title, or noted in another metadata field).

**Pros:** Automatic, no per-track config needed. Handles the class of problem.
**Cons:** Requires access to the full track list during transform (currently transforms are stateless per-track). Could produce unexpected results if the heuristic misfires.

### Approach B: Config-Level Artist Overrides

A new config section that lets users specify explicit artist rewrites:

```toml
[cleanArtists.overrides]
"Babsy & 1-800 GIRLS" = { artist = "1-800 GIRLS", title = "The Middle (Babsy remix)" }
```

**Pros:** Precise, no false positives, user controls the output exactly.
**Cons:** Manual, doesn't scale, requires the user to know about each problematic track.

### Output Format Decision

When a remix flip is detected (by either approach), the original artist should not be lost entirely. Options for where to preserve it:

- Append to artist field: `"1-800 GIRLS & Babsy"` (reversed order)
- Include in title: `"The Middle (Babsy remix)"` — though the title may already say this
- Leave the title as-is if it already credits the original artist (which it often does for remix singles)

The implementation should avoid duplicating information that's already in the title.

## User Stories

1. As a podkit user with remix singles in my collection, I want the iPod artist field to reflect the artist I actually care about, so I can find the track when browsing by artist.
2. As a podkit user, I want the original artist to still be credited somewhere when a remix flip occurs, so that attribution is not lost.
3. As a podkit user, I don't want redundant featuring text appended when the remixer is already named in the title, so the display is clean.
4. As a podkit user, I want to be able to override artist attribution for specific tracks in my config, so I have an escape hatch for edge cases no heuristic can handle.
5. As a podkit user, I want the remix flip to work for both `"A & B"` tagged remixes and clean-artist remixes where I'd prefer a different primary, so both patterns are covered.
6. As a podkit user, I want `--dry-run` to show me when a remix flip would occur, so I can verify the behaviour before syncing.
7. As a podkit user with `"Normal Average People — Refund Taxi (1-800 Girls remix)"` in my collection, I want a way to make this track appear under "1-800 GIRLS" in my iPod artist list, so both remix attribution patterns are addressed.
8. As a podkit user, I want the heuristic (if implemented) to not affect tracks where the left-hand artist is clearly the primary (e.g. `"CHVRCHES & Hayley Williams"` with 67 CHVRCHES tracks), so existing correct behaviour is preserved.

## Implementation Decisions

- This is currently an exploration/decision task — the first step is to decide between Approach A (heuristic), Approach B (config overrides), or a combination.
- If Approach A is chosen, the transform pipeline would need to become collection-aware. This means `applyTransforms` would need access to collection-level statistics (artist track counts). This is a significant architectural change — transforms are currently pure per-track functions.
- An alternative to making transforms stateful is a pre-processing step that computes "artist importance scores" and passes them as part of the config.
- If Approach B is chosen, the config schema gains a `[cleanArtists.overrides]` table. The key would be the exact source artist string, and the value would specify the desired output fields.
- Both approaches could coexist: the heuristic handles the common case, and overrides handle everything else.
- The Normal Average People case is different from the Babsy case — the artist field is already clean, so the transform doesn't fire. Handling it would require a broader "artist rewrite" feature, not just a change to the splitting logic. This should be considered in the design.
- The `"remix"` detection in the title/album should use a simple case-insensitive substring match, consistent with how the existing transform detects featuring info in titles.

## Testing Decisions

- If Approach A: test the heuristic with mock collection data — verify it fires on the Babsy case, does NOT fire on CHVRCHES, and produces correct output.
- If Approach B: test config parsing and override application.
- Test that the original artist is preserved in the output (not silently dropped).
- Test the interaction between remix flip and existing `ignore` list behaviour.
- The existing transform pipeline tests (`pipeline.test.ts`) and ftintitle tests provide prior art.
- Good tests verify the end-to-end track metadata output, not the internal heuristic scoring.

## Out of Scope

- Changes to how `vs.` tokens are formatted (covered by the separator-aware formatting PRD).
- Slash-delimited artist pre-processing (covered by the multi-segment artist PRD).
- Automatic tagging fixes in Navidrome or other sources — this PRD is about podkit's transform layer.
- Broad "artist alias" or "artist merge" features — this is specifically about remix attribution.

## Further Notes

- In the current navidrome collection of 2,821 tracks, exactly 1 track would trigger the remix flip heuristic (`Babsy & 1-800 GIRLS`). The Normal Average People track would require the broader "artist rewrite" approach since its artist field is already clean.
- The collection presence heuristic was validated against all 33 ambiguous matches in the collection. It correctly identified the Babsy case as reversed (1-800 GIRLS: 26 tracks, Babsy: 0 tracks) and did not produce false positives on any other track.
- This feature interacts with the broader question of how podkit handles compilation albums and multi-artist releases. The design should be careful not to paint itself into a corner.
