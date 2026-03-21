---
id: doc-008
title: iPod Artwork Corruption — Research & Autopsy Plan
type: other
created_date: '2026-03-21 14:24'
---
# iPod Artwork Corruption — Research & Autopsy Plan

## Purpose

This document is a research plan for investigating artwork corruption on iPod devices managed by podkit. The goal is to understand the root cause, determine what (if anything) can be detected and repaired programmatically, and produce a technical report that enables someone else to design user-facing solutions.

**This is an investigation, not a product spec.** The deliverable is a report explaining:
- What went wrong (confirmed root cause or narrowed candidates)
- How to detect corruption programmatically (what to look for, what tools/APIs to use)
- What data needs to change to restore consistency (which files, which fields, what operations)

Someone else will design the UX. They need this report to understand the problem space.

---

## Observed Symptoms

- Album artwork displays incorrectly on a 5th-generation iPod Video (MA147, 60GB)
- Playing a song shows artwork from a different track/album
- After rebooting the iPod and playing the same song, a *different* wrong artwork was displayed — suggesting the corruption is not a simple fixed offset shift
- A subsequent sync (adding more songs) did not resolve the issue
- Reproduction: play songs and observe the artwork displayed during playback (this iPod model only shows artwork during playback, not in list views)

## Subject Device

- **Model:** iPod Video 5th Generation (MA147, 60GB Black)
- **Device name:** TERAPOD
- **Key characteristic:** Non-sparse artwork — `itdb_device_supports_sparse_artwork()` returns FALSE for `ITDB_IPOD_GENERATION_VIDEO_1` and `VIDEO_2`
  - Every track gets its own separate copy of artwork pixel data in .ithmb files (no deduplication)
  - More entries = more rearrangement operations per save = more opportunities for corruption

---

## iPod Artwork Architecture

Understanding the data structures is essential for the investigation. Reference this section when building analysis tools.

### File Layout

```
iPod_Control/
├── iTunes/
│   └── iTunesDB              # Track database — contains mhii_link per track
├── Artwork/
│   ├── ArtworkDB             # Artwork database — MHII entries with ithmb references
│   ├── F1028_1.ithmb         # Pixel data for format 1028 (100×100 RGB565)
│   ├── F1029_1.ithmb         # Pixel data for format 1029 (200×200 RGB565)
│   └── ...                   # Additional files if > 256 MB per format
└── Device/
    └── SysInfo               # Model identification (e.g., "ModelNumStr: MA147")
```

### ArtworkDB Binary Structure

```
MHFD (Database Header)
├── MHSD type=1 (Image List Section)
│   └── MHLI (Image List)
│       ├── MHII (Image Item — one per unique artwork)
│       │   ├── image_id      → matches track.mhii_link
│       │   ├── song_id       → track.dbid (backward compat)
│       │   └── MHOD type=2 (Thumbnail Container)
│       │       └── MHNI (Thumbnail Reference)
│       │           ├── format_id    → artwork format (1028, 1029, etc.)
│       │           ├── ithmb_offset → byte offset into .ithmb file
│       │           ├── image_size   → byte count of pixel data
│       │           └── MHOD type=3 (Filename — e.g., ":F1028_1.ithmb")
│       └── ... more MHII entries
├── MHSD type=2 (Album List Section)
│   └── MHLA → MHBA (Photo album entries, not used for music artwork)
└── MHSD type=3 (File List Section)
    └── MHLF → MHIF (Format info entries — one per artwork format)
```

### Track → Artwork Linking Chain

```
iTunesDB track record
    └── mhii_link (uint32)
            │
            ▼
ArtworkDB MHII entry
    └── image_id == mhii_link
        └── MHNI child
            ├── filename: ":F1028_1.ithmb"
            ├── offset: 204800       ← byte position in ithmb file
            └── size: 20000          ← bytes of pixel data
                    │
                    ▼
.ithmb file
    └── raw RGB565 pixel data at offset 204800, length 20000
```

**Non-sparse linking (this device):** Each track gets a unique `artwork->id`. `track.mhii_link = artwork->id`. 1:1 mapping.

### Artwork ID Assignment During Save

`ipod_artwork_db_set_ids()` runs during every `itdb_write()`:

```c
guint32 cur_id = 0x64;  // IDs start at 100
for each track in db->tracks:
    track->mhii_link = 0;
    if track has thumbnails:
        track->artwork->id = cur_id++;
        track->artwork->dbid = track->dbid;
    track->mhii_link = track->artwork->id;
```

Key observations:
- IDs are **reassigned sequentially** on every save based on track list order
- A track's artwork ID can change between saves if tracks are added/removed before it in the list
- The `mhii_link` is set unconditionally to `artwork->id`, even for tracks without thumbnails

### ithmb Pixel Format (iPod Video)

- RGB565 little-endian: 5 bits red (11-15), 6 bits green (5-10), 5 bits blue (0-4)
- 2 bytes per pixel, no alpha channel
- Two artwork sizes:

| Format ID | Size | Bytes per thumbnail |
|-----------|------|---------------------|
| 1028 | 100×100 | 20,000 bytes |
| 1029 | 200×200 | 80,000 bytes |

- Thumbnails stored back-to-back in .ithmb files, each file capped at 256 MB

### No Integrity Validation

The ArtworkDB format has **no checksums, CRCs, or integrity validation**. The only structural validation is:
- 4-byte ASCII magic headers ("mhfd", "mhii", "mhni", etc.)
- `total_len` fields that should sum correctly
- `num_children` counts

There is no way for the iPod firmware or libgpod to detect that pixel data at a given ithmb offset doesn't match what was originally written for a specific track. Corruption is silent.

---

## Hypotheses

Track these throughout the investigation. Update status and evidence as findings emerge.

### H1: libgpod ithmb rearrangement bug

**Status:** Unconfirmed — primary suspect from ADR-013

**Theory:** `ithmb_rearrange_existing_thumbnails()` in `ithumb-writer.c` (lines 1402-1524) performs in-place binary surgery on .ithmb files during every save. It compacts gaps by copying pixel data from the last occupied slot to fill orphaned slots, updating offset pointers. Failure modes:
- Offset miscalculation during compaction (wrong MHNI updated)
- Partial write / interrupted save (ithmb modified but ArtworkDB not yet written)
- Cumulative drift across multiple sync sessions

**What evidence would confirm:** Structural anomalies in ArtworkDB — duplicate offsets, offsets not aligned to slot boundaries, offsets exceeding file size. Patterns consistent with a slot-swap error (e.g., two tracks pointing to same offset, or offsets shifted by exactly one slot size).

**What evidence would refute:** Perfectly clean structural data with correct offsets, but pixel data at those offsets visually belonging to wrong tracks. That would point to the pixel data itself being written to wrong locations.

### H2: Hardware/filesystem bit-rot

**Status:** Unconfirmed

**Theory:** The iPod is 20 years old with a spinning hard drive and FAT32 filesystem (no journaling, no checksums). Random bit flips in the ArtworkDB or ithmb files could corrupt offset pointers or pixel data.

**What evidence would confirm:** Isolated, random-looking corruption — a single flipped bit in an offset field, or pixel data that's mostly correct but has a few corrupted bytes. Corruption not correlated with compaction patterns.

**What evidence would refute:** Systematic, repeatable patterns (e.g., all offsets shifted, multiple tracks swapped). Bit-rot would be random, not systematic.

### H3: Pre-release podkit code wrote inconsistent state

**Status:** Unconfirmed

**Theory:** Earlier development versions of podkit's sync/artwork pipeline may have had bugs that wrote the database into an inconsistent state. Those bugs are now fixed, but the damage persists.

**What evidence would confirm:** Difficult to confirm directly — no git history of syncs to this device. Indirect evidence: if the corruption pattern matches a known-fixed bug (e.g., artwork replace not clearing old thumbnails before setting new ones).

**What evidence would refute:** Corruption that demonstrably occurred on tracks synced with current, stable code.

### H4: Artwork replace path is fundamentally flawed

**Status:** Unconfirmed

**Theory:** The upgrade path (remove old artwork → set new artwork → save) might leave the database in a bad state. For example, removing artwork might orphan an ithmb slot, and the subsequent rearrangement to compact that slot could corrupt other tracks' references.

**What evidence would confirm:** Corruption concentrated on tracks that have been through artwork upgrades (their sync tags would show `art=` hash changes). Tracks synced fresh (never upgraded) would be clean.

**What evidence would refute:** Corruption on tracks that were synced once and never modified.

### H5: Something else entirely

**Status:** Open

Keep this as a catch-all. If evidence doesn't fit any of the above, document what was observed and form new hypotheses.

---

## Research Plan

### Phase 0: Backup the iPod

**Goal:** Preserve the corrupted state before any further operations modify it.

**Steps:**
1. Mount the iPod (expected at `/Volumes/TERAPOD` or similar)
2. Copy the entire iPod contents to `~/Workstation/ipod-autopsy/ipod-backup/`
   ```bash
   rsync -av /Volumes/TERAPOD/ ~/Workstation/ipod-autopsy/ipod-backup/
   ```
3. Verify the backup — check file counts and sizes match
4. All subsequent analysis works against the backup, not the live iPod (faster, safer)

**Output:** Complete iPod filesystem snapshot at `~/Workstation/ipod-autopsy/ipod-backup/`

### Phase 1: Code Audit of libgpod Artwork Pipeline

**Goal:** Understand the code that writes artwork data, identify specific failure modes, and determine what data patterns each failure mode would leave behind. This informs what to look for in Phase 3.

**Source location:** `tools/libgpod-macos/build/libgpod-0.8.3/src/`

**Key files to audit:**

| File | Functions | Why |
|------|-----------|-----|
| `ithumb-writer.c` | `ithmb_rearrange_existing_thumbnails()` (lines 1402-1524) | The primary suspect — in-place ithmb compaction |
| `ithumb-writer.c` | `itdb_write_ithumb_files()` | Orchestrates the full artwork write sequence |
| `db-artwork-writer.c` | `ipod_artwork_db_set_ids()` | ID assignment — renumbers all artwork IDs on every save |
| `db-artwork-writer.c` | `ipod_write_artwork_db()` | Writes the ArtworkDB binary file |
| `db-artwork-parser.c` | ArtworkDB parsing functions | Understand how libgpod reads back what it wrote |
| `itdb_thumb.h` / related | Thumbnail type definitions | IPOD vs MEMORY thumb types, state transitions |

**Specific questions to answer:**
1. In `ithmb_rearrange_existing_thumbnails()`: when a slot is compacted, how is the "correct" MHNI entry found to update the offset? Is there a uniqueness assumption that could break?
2. What happens when a track's artwork is replaced (remove + set) within a single save cycle? Are both the old and new thumbnails present during rearrangement?
3. Is there a race between ID reassignment (`set_ids`) and ithmb writing? Are they always sequenced correctly?
4. What error handling exists? If an ithmb read/write fails partway through, what state is left?
5. For non-sparse devices specifically: are there any code paths that differ from sparse that could be buggy?

**Output:** Annotated notes on each function. For each identified failure mode, document:
- The trigger condition
- The expected data pattern it would leave in ArtworkDB/ithmb
- How likely it is in practice

### Phase 2: Build Analysis Tools

**Goal:** Create tools that can parse and report on iPod artwork internals.

**Approach:** Start with a small C tool using libgpod's own parsers (to see what libgpod sees), then build TypeScript tooling for cross-referencing and reporting. After the investigation, any tools worth keeping should be in TypeScript.

#### 2a: C analysis tool (libgpod-based)

Build a small C program (similar to gpod-tool) that:
- Opens an iPod database
- Dumps all track records with their `mhii_link` values
- Dumps all MHII entries from ArtworkDB with their image_id, MHNI children (format_id, ithmb_offset, image_size, filename)
- Cross-references: for each track, resolve mhii_link → MHII → MHNI → ithmb location
- Reports anomalies: orphaned MHII entries, unresolvable mhii_links, out-of-bounds offsets

**Note:** libgpod has `db-artwork-debug.h` — investigate what debug dump functions already exist before writing new ones.

**Location for this tool:** `tools/artwork-debug/` or extend `tools/gpod-tool/`

#### 2b: Expose mhii_link in libgpod-node bindings

Add `mhiiLink` (uint32, read-only) to the Track interface in libgpod-node:
- Add to `TrackToObject` in `packages/libgpod-node/native/gpod_converters.cc`
- Add to Track type in `packages/libgpod-node/src/types.ts`

This allows TypeScript tooling to read the linking field without a separate C tool.

#### 2c: TypeScript analysis scripts

Scripts in `~/Workstation/ipod-autopsy/tools/` or within the repo (TBD) that:
1. **ArtworkDB parser** — parse the binary ArtworkDB format directly (the format is documented above). Extract all MHII entries, MHNI references, offsets.
2. **Cross-reference report** — match iTunesDB tracks (via libgpod-node) against ArtworkDB entries. Flag inconsistencies.
3. **ithmb thumbnail extractor** — read raw RGB565 pixel data at a given offset, convert to PNG/JPEG for visual inspection. This enables the "show a human and ask if it's right" workflow.
4. **Structural integrity checker** — automated checks:
   - Every track's mhii_link resolves to an MHII entry
   - Every MHII entry is referenced by at least one track
   - Every MHNI offset is within the bounds of its ithmb file
   - Every MHNI offset is aligned to the expected slot size (20,000 or 80,000 bytes)
   - No two MHNI entries for the same format point to the same offset (on non-sparse devices)
   - MHII count matches track-with-artwork count

**Output:** Working tools that can produce a structured report from iPod data.

### Phase 3: Autopsy

**Goal:** Run the analysis tools against the backed-up iPod data. Document all findings.

**Approach — work through these checks in order:**

#### 3a: Structural integrity (automated)

Run the structural integrity checker from Phase 2c. This is the fastest path to confirming corruption:
- Are all mhii_links valid?
- Are there orphaned MHII entries?
- Are all ithmb offsets in-bounds and aligned?
- Are there duplicate offsets (on this non-sparse device)?
- Do MHII counts match expectations?

**If anomalies are found:** Document each one. Cross-reference against the failure modes identified in Phase 1 — does the pattern match a specific hypothesis?

#### 3b: Offset pattern analysis

If structural issues are found, look for patterns:
- Are corrupted offsets clustered (suggesting a single compaction error) or scattered?
- Do any offsets differ by exactly one slot size (20,000 or 80,000 bytes) — suggesting an off-by-one in compaction?
- Are there groups of tracks that appear to have had their artwork "rotated" — each pointing to the next track's artwork?
- Map out the expected vs actual offset layout across the full ithmb file

#### 3c: Visual confirmation (human-assisted)

If structural analysis is inconclusive or to validate findings:
1. Select a sample of tracks (mix of known-corrupt and presumably-clean)
2. Extract the RGB565 pixel data at each track's ithmb offset
3. Convert to viewable PNG images
4. Present alongside track metadata (title, artist, album)
5. Human confirms: "correct artwork" or "wrong artwork — this belongs to [album X]"

If a track's artwork clearly belongs to another specific track, check whether those two tracks' offsets were swapped — this would be strong evidence for a compaction bug.

#### 3d: Source comparison (if source collection available)

If the source collection on the NAS is accessible:
1. For a sample of tracks, extract embedded artwork from the source file
2. Render it alongside the ithmb pixel data for the same track
3. Visual comparison confirms whether the iPod has the right artwork at the right offset

This is a deeper level of confirmation but requires source access and manual comparison.

### Phase 4: Report

**Goal:** Produce a document that someone else can use to design user-facing solutions.

**The report should contain:**

1. **Executive summary** — one paragraph: what was found, how confident we are, what can be done about it
2. **Root cause analysis** — which hypothesis was confirmed (or which were narrowed down). Evidence cited.
3. **Corruption characteristics** — is it detectable programmatically? What markers to look for? Is it systematic or random?
4. **Detection approach** — step-by-step description of how a tool could detect this corruption. What data it reads, what checks it performs, what confidence level each check provides.
5. **Repair approach** — what data needs to change to restore consistency. Which files are rewritten. What operations (in terms of libgpod API calls or raw binary edits) would fix it. Whether a partial fix (just rewrite ArtworkDB pointers) is possible or whether a full artwork rebuild (re-extract from source, rewrite ithmb files) is necessary.
6. **Prevention** — can future syncs avoid triggering the corruption? Is there a safer artwork write strategy?
7. **Fallback if unfixable** — if programmatic detection/repair isn't feasible, what should we tell users? What manual steps resolve the issue?
8. **Tools produced** — inventory of analysis tools built during the investigation, what they do, how to run them
9. **Open questions** — anything unresolved that needs further investigation

**Location:** Update ADR-013 with findings, or create a new document alongside it.

---

## Working Pattern

Use this structure to track progress during the investigation.

### Findings Log

As you work through each phase, record findings in this format:

```
### Finding F-NNN: [Short title]
**Phase:** [which phase produced this]
**Relates to:** [H1/H2/H3/H4/H5]
**Evidence:** [what was observed — be specific with numbers, offsets, file names]
**Interpretation:** [what this means for the hypothesis]
**Confidence:** [high/medium/low]
**Follow-up:** [any additional investigation needed]
```

### Hypothesis Updates

After each phase, revisit the hypothesis table:
- Update status (unconfirmed → supported / weakened / refuted / confirmed)
- Note which findings support or contradict each hypothesis
- If new hypotheses emerge from the data, add them

### Decision Points

At certain points, the investigation may fork:
- **After Phase 1 (code audit):** If a clear, testable failure mode is identified, prioritise looking for that specific pattern in Phase 3.
- **After Phase 3a (structural checks):** If structural corruption is found, Phase 3c (visual) may be unnecessary. If structure is clean, visual confirmation becomes essential.
- **After Phase 3c (visual):** If visual confirms corruption but structure is clean, the problem is in the pixel data itself (written to wrong offsets during the original save), not in pointer corruption. This narrows the investigation to the ithmb write path rather than the rearrangement path.

---

## Key Resources

| Resource | Location |
|----------|----------|
| ADR-013 (original investigation) | `adr/adr-013-ipod-artwork-corruption-diagnosis-and-repair.md` |
| libgpod source (local) | `tools/libgpod-macos/build/libgpod-0.8.3/src/` |
| libgpod artwork writer | `tools/libgpod-macos/build/libgpod-0.8.3/src/ithumb-writer.c` |
| libgpod artwork DB writer | `tools/libgpod-macos/build/libgpod-0.8.3/src/db-artwork-writer.c` |
| libgpod artwork DB parser | `tools/libgpod-macos/build/libgpod-0.8.3/src/db-artwork-parser.c` |
| libgpod artwork debug | `tools/libgpod-macos/build/libgpod-0.8.3/src/db-artwork-debug.h` |
| gpod-tool (existing C tool) | `tools/gpod-tool/gpod-tool.c` |
| Artwork operations (C++ bindings) | `packages/libgpod-node/native/artwork_operations.cc` |
| Track converter (C++ bindings) | `packages/libgpod-node/native/gpod_converters.cc` |
| Artwork extractor (TypeScript) | `packages/podkit-core/src/artwork/extractor.ts` |
| Artwork hash (TypeScript) | `packages/podkit-core/src/artwork/hash.ts` |
| Sync tags (TypeScript) | `packages/podkit-core/src/sync/sync-tags.ts` |
| iPod backup | `~/Workstation/ipod-autopsy/ipod-backup/` |
| Analysis tools (to be created) | `~/Workstation/ipod-autopsy/tools/` or `tools/artwork-debug/` |

## Scope Boundaries

**In scope:**
- Backing up and analysing the corrupted iPod
- Auditing libgpod source code related to artwork
- Building analysis/diagnostic tools
- Producing a technical report with detection and repair approaches

**Out of scope:**
- Designing user-facing CLI commands (UX is someone else's job)
- Fixing libgpod itself (we work around it)
- Building a production repair tool (the report describes what one would need to do)
- Analysing non-artwork database issues
