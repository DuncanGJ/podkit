---
title: "ADR-009: libgpod Removal Feasibility Study"
description: Analysis of replacing the libgpod C library with a pure TypeScript implementation for iPod database management.
sidebar:
  order: 10
---

# ADR-009: libgpod Removal Feasibility Study

## Status

**Draft** (2026-03-11)

## Context

podkit currently depends on libgpod (v0.8.3), a C library, through N-API bindings (`@podkit/libgpod-node`). This dependency creates significant friction:

1. **Native binary distribution** — Prebuilt binaries must be compiled and shipped for every platform/arch combination (currently macOS arm64, macOS x64, Linux x64)
2. **Developer environment complexity** — Contributors need libgpod headers, GLib, GdkPixbuf, and a C++ toolchain to build from source
3. **Unmaintained upstream** — libgpod 0.8.3 is effectively abandoned; the last meaningful release was years ago
4. **Behavioral workarounds** — 4 documented deviations where our bindings must work around libgpod bugs (playlist cleanup, master playlist creation, directory auto-creation, NULL chapterdata crashes)
5. **Debugging difficulty** — Native crashes produce core dumps, not JS stack traces; memory errors in C++ are opaque to TypeScript developers
6. **Build system complexity** — node-gyp, binding.gyp, platform-specific pkg-config, static linking verification, prebuildify pipeline

This document evaluates whether libgpod can be replaced with a pure TypeScript implementation and provides the technical detail needed to plan that work.

## Decision Drivers

- Eliminate native binary distribution complexity
- Simplify contributor onboarding (no C++ toolchain)
- Remove unmaintained dependency
- Improve debugging and error reporting
- Maintain full compatibility with all currently supported iPod models
- Preserve existing test coverage and API contracts

---

## Part 1: Current State Assessment

### What libgpod Does

libgpod performs five categories of operations, all of which are standard file I/O and data manipulation — no hardware-level or kernel-level access is required:

| Category | Operations | Complexity |
|----------|-----------|------------|
| **iTunesDB parsing/writing** | Read/write binary database files | High |
| **Artwork management** | Resize images, convert to device-specific pixel formats, write .ithmb files | High |
| **File management** | Copy audio files to iPod, generate paths, manage F00-F49 directories | Low |
| **Device identification** | Parse SysInfo, look up model capabilities | Low |
| **Database integrity** | Compute hash58 checksum for newer iPods | Medium |

### Current Codebase Inventory

| Component | Lines | Purpose |
|-----------|-------|---------|
| Native C++ bindings (`native/*.cc`, `native/*.h`) | 3,729 | N-API wrapper around libgpod |
| TypeScript API layer (`src/*.ts`, excluding tests) | 4,417 | Type-safe Database class, enums, converters |
| Integration tests (`src/__tests__/*.ts`) | 7,290 | 12 test files covering all binding operations |
| gpod-tool (`tools/gpod-tool/gpod-tool.c`) | 735 | C CLI for test iPod setup |
| gpod-testing (`packages/gpod-testing/`) | ~500 | TypeScript test helpers wrapping gpod-tool |
| Prebuild CI (`.github/workflows/prebuild.yml`) | 163 | 3-platform binary build pipeline |
| macOS build scripts (`tools/libgpod-macos/`) | 292 | Build libgpod from source on macOS |
| Static deps build (`tools/prebuild/`) | ~200 | Build static libraries for CI |
| binding.gyp | 49 | node-gyp build configuration |

**Total infrastructure supporting native bindings: ~17,375 lines across C++, TypeScript, YAML, shell scripts, and build configs.**

### Exposed API Surface

The `Database` class exposes 48 instance methods organized into these groups:

**Database lifecycle (8 methods):**
`open`, `openSync`, `openFile`, `openFileAsync`, `create`, `initializeIpod`, `initializeIpodSync`, `save`, `saveSync`, `close`, `setMountpoint`, `getMountpoint`, `getFilename`

**Database state (4 methods):**
`getInfo`, `trackCount`, `playlistCount`, `device`

**Track operations (10 methods):**
`getTracks`, `getTrack`, `addTrack`, `removeTrack`, `updateTrack`, `getTrackByDbId`, `copyTrackToDevice`, `copyTrackToDeviceAsync`, `getTrackFilePath`, `duplicateTrack`

**Artwork operations (6 methods):**
`setTrackThumbnails`, `setTrackThumbnailsFromData`, `removeTrackThumbnails`, `hasTrackThumbnails`, `getUniqueArtworkIds`, `getArtworkFormats`

**Playlist operations (9 methods):**
`getPlaylists`, `createPlaylist`, `removePlaylist`, `getPlaylistById`, `getPlaylistByName`, `setPlaylistName`, `addTrackToPlaylist`, `removeTrackFromPlaylist`, `playlistContainsTrack`, `getPlaylistTracks`

**Smart playlist operations (8 methods):**
`createSmartPlaylist`, `getSmartPlaylistRules`, `addSmartPlaylistRule`, `removeSmartPlaylistRule`, `clearSmartPlaylistRules`, `setSmartPlaylistPreferences`, `getSmartPlaylistPreferences`, `evaluateSmartPlaylist`

**Chapter operations (4 methods):**
`getTrackChapters`, `setTrackChapters`, `addTrackChapter`, `clearTrackChapters`

**Device info (3 methods):**
`getDeviceCapabilities`, `getSysInfo`, `setSysInfo`

**Photo database** is a separate `PhotoDatabase` class with ~15 methods for photo/album management.

### Consumers of libgpod-node

The binding is consumed through a single abstraction layer:

```
@podkit/libgpod-node  →  @podkit/core (IpodDatabase)  →  @podkit/cli
```

**Direct imports in podkit-core** (`packages/podkit-core/src/ipod/`):
- `database.ts` — Main consumer: `Database`, `TrackHandle`, `Playlist`
- `track.ts` — Types: `TrackHandle`, `Track`
- `playlist.ts` — Types: `Playlist`
- `generation.ts` — Types: `IpodGeneration`

The `IpodDatabase` class in podkit-core wraps the low-level `Database` and provides the public API used by CLI commands and sync logic. **This abstraction boundary is the natural seam for replacement** — the `IpodDatabase` interface can remain stable while the backing implementation changes.

### Known Behavioral Deviations

These are bugs/gaps in libgpod that our bindings work around. A pure TypeScript implementation would handle these correctly by design:

| # | Operation | libgpod Bug | Our Workaround | Impact of Not Fixing |
|---|-----------|-------------|----------------|---------------------|
| 1 | `removeTrack()` | Doesn't remove track from playlists | Remove from all playlists before `itdb_track_remove()` | `assertion 'link' failed` during save; database corruption |
| 2 | `create()` | Creates database without master playlist | Create master playlist after `itdb_new()` | `assertion 'mpl' failed`; database unusable |
| 3 | `initializeIpod()` | Requires mountpoint directory to exist | `g_mkdir_with_parents()` before init | Confusing error on fresh iPod setup |
| 4 | `clearTrackChapters()` | `itdb_chapterdata_free()` crashes on NULL | Create empty chapterdata instead of NULL | `assertion 'chapterdata' failed` on close |

---

## Part 2: Technical Feasibility Analysis

### Core Question: Can JavaScript Do Everything libgpod Does?

**Yes.** Every operation libgpod performs is standard binary file I/O, data structure manipulation, image processing, or cryptographic hashing. None of these require C/C++ for correctness or performance at iPod database scale.

### Detailed Breakdown by Subsystem

#### 1. iTunesDB Binary Parsing and Writing

**What it is:** The iTunesDB is a tagged binary format using little-endian integers. Records are identified by 4-byte ASCII tags (`mhbd`, `mhlt`, `mhit`, `mhod`, etc.). The format is hierarchical:

```
mhbd (Database Header)
├── mhlt (Track List)
│   └── mhit (Track Item) × N
│       └── mhod (Data Object) × M  — title, artist, album, path, etc.
├── mhlp (Playlist List)
│   └── mhyp (Playlist) × N
│       └── mhip (Playlist Item) × N
└── mhla (Album List) — newer iPods only
```

**JavaScript capability:** `Buffer` and `DataView` provide full byte-level control:
```typescript
// Reading a little-endian uint32 at offset
const value = dataView.getUint32(offset, true);
// Writing a UTF-16LE string (iPod string encoding)
Buffer.from(title, 'utf16le');
```

**Complexity factors:**
- ~100+ `mhod` subtypes (strings, URLs, smart playlist data, sort fields, etc.)
- Format variations between iPod generations (different header sizes, optional fields)
- Must preserve unknown/unrecognized fields for round-trip fidelity — if the database contains fields we don't understand, we must write them back unchanged
- String encoding: iPod uses UTF-16LE for all text fields

**Prior art proving feasibility:**
- [GNUpod](https://www.gnu.org/software/gnupod/) — Complete iTunesDB read/write in Perl (~3,000 lines). Maintained for years, supports all iPod models podkit targets. Proves a scripting language can handle the complete database lifecycle including writing.
- [iPodLinux wiki](https://web.archive.org/web/20110514113255/http://ipl.derpapst.org/wiki/ITunesDB) — Comprehensive format specification with field-level documentation
- [libgpod source](https://github.com/libgpod/libgpod) — Reference implementation, readable C with GLib, ~8,000 lines for iTunesDB core (`itdb_itunesdb.c`)
- [SharePod](https://web.archive.org/web/20130313065141/http://getsharepod.com/) — C# implementation (Windows)
- [Banshee](https://en.wikipedia.org/wiki/Banshee_(media_player)) — C# iPod support via libgpod-sharp, but the binding layer shows the API surface clearly

**Estimated effort:** 3-4 weeks (largest single component)

**Risk level:** Medium-High. The format is well-documented but has many subtleties. The primary risk is data corruption from format misunderstanding, mitigated by extensive round-trip testing.

#### 2. Artwork Database and .ithmb Files

**What it is:** iPod stores album artwork in device-specific formats in `iPod_Control/Artwork/`. Each iPod model supports specific image dimensions and pixel formats.

**Supported formats** (finite, frozen set — no new iPods):

| Format ID | Dimensions | Pixel Format | Used By |
|-----------|-----------|-------------|---------|
| 1028 | 100×100 | RGB565 LE | iPod Video (small thumbnail) |
| 1029 | 200×200 | RGB565 LE | iPod Video (large thumbnail) |
| 1055 | 128×128 | JPEG | iPod Classic |
| 1060 | 320×320 | JPEG | iPod Classic (full screen) |

**RGB565 conversion** is simple bit math:
```typescript
const rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
```

**Image resizing:** The `sharp` library (backed by libvips) is faster and better maintained than GdkPixbuf. It's already a common Node.js dependency and would actually be an upgrade:
- Faster image processing
- Better format support
- Active maintenance
- Pure npm install (prebuilt binaries via sharp's own distribution)

Note: `sharp` itself ships prebuilt binaries, so this doesn't fully eliminate native dependencies — but sharp's distribution is extremely mature and supports every major platform. Alternatively, a WASM-based image library could provide zero-native-dependency image processing.

**.ithmb file format:** These are simple concatenated raw pixel data — no complex container format. Each artwork entry is at a known offset and size within the file.

**Artwork database format:** Separate from iTunesDB but uses similar tagged binary structure (`mhfd`, `mhli`, `mhii`, `mhod`). Smaller and simpler than the main database.

**Estimated effort:** 1-2 weeks

**Risk level:** Medium. The set of formats is finite and well-documented. Device-specific testing is important but the format variations are bounded.

#### 3. Database Checksum (hash58)

**What it is:** iPod Classic (6th gen+) and iPod Nano (3rd gen+) require a SHA-1 hash at byte offset 0x58 of the iTunesDB. This hash incorporates the device's FireWire GUID from SysInfo.

**History:** The algorithm was [cracked in September 2007](https://hardware.slashdot.org/story/07/09/17/135205/new-ipod-checksum-cracked-linux-supported) and has been implemented in libgpod since then. The algorithm is:
1. Read FireWire GUID from SysInfo
2. Compute SHA-1 of specific database regions combined with the GUID
3. Write 20-byte hash at offset 0x58

**JavaScript capability:** Node.js `crypto.createHash('sha1')` uses OpenSSL under the hood — identical performance and correctness to any C implementation.

**Estimated effort:** 2-3 days

**Risk level:** Low. Algorithm is well-documented and testable against known-good outputs from libgpod.

#### 4. File Copying and Path Generation

**What it is:** When adding a track, the audio file must be copied to `iPod_Control/Music/Fxx/` where xx is 00-49. libgpod generates a random filename like `libgpod123456.m4a`.

**Path format in database:** Uses colon separators: `:iPod_Control:Music:F01:libgpod123456.m4a`

**JavaScript capability:** `fs.copyFile()`, `crypto.randomBytes()` for filename generation, `path.join()` for path construction. Trivial.

**Estimated effort:** 1 day

**Risk level:** Very low.

#### 5. Device Identification and Capability Detection

**What it is:** Parse the `SysInfo` text file in `iPod_Control/Device/` to determine iPod model, then look up capabilities (supported artwork formats, video support, etc.) from a static model table.

**SysInfo format:**
```
ModelNumStr: MA147
FirewireGuid: 000A2700394CC548
```

**Model table:** A static lookup mapping ~30 model numbers to device capabilities. The set is finite and frozen (Apple stopped making clickwheel iPods in 2014).

**Model number parsing quirk:** libgpod skips the leading letter (`MA147` → look up `A147`). Must replicate this exactly.

**Estimated effort:** 1-2 days

**Risk level:** Very low. The table is finite, testable, and unchanging.

#### 6. Smart Playlist Rules

**What it is:** Smart playlists store rules as binary-encoded structures within `mhod` type 50/51/52 records. Rules define field matches (artist contains "X", rating > 3, etc.) with boolean logic (match all/any).

**Complexity factors:**
- ~30 queryable fields (title, artist, album, genre, rating, play count, etc.)
- ~20 match operators (contains, starts with, greater than, in range, etc.)
- Limit types (by count, size, time) with sort orders
- Rule evaluation for smart playlist preview

**Estimated effort:** 1 week (included in iTunesDB parsing, but rule evaluation logic is separate)

**Risk level:** Medium. Binary encoding of rules is less well-documented than core iTunesDB fields. libgpod source is the primary reference.

#### 7. Photo Database

**What it is:** Separate database format (`iPod_Control/Photos/`) for photo storage. Similar tagged binary structure to iTunesDB but smaller scope.

**Estimated effort:** 1-2 weeks

**Risk level:** Medium. Less widely documented than iTunesDB. Lower priority — photo support may be deferred.

### Performance Considerations

**iPod databases are tiny by modern standards:**
- A 160GB iPod Classic holds ~40,000 songs maximum
- The iTunesDB for a full 40,000-track library is ~20-30MB
- Parse time in C: <100ms. Parse time in JS: likely <500ms (still instantaneous from user perspective)
- This is not a performance-sensitive workload

**Image processing** is the only potentially performance-relevant area, and `sharp` (libvips) is significantly faster than GdkPixbuf.

**SHA-1 hashing** of a 30MB database takes <10ms in Node.js (OpenSSL backend).

**No operation in this system benefits meaningfully from C/C++ over JavaScript.**

---

## Part 3: Implementation Strategy

### Architecture: New Package `@podkit/ipod-db`

Create a new pure TypeScript package rather than modifying libgpod-node in place. This enables:
- Side-by-side testing against libgpod output
- Gradual migration with rollback capability
- Clean architecture unburdened by libgpod's API shape

```
packages/
├── ipod-db/              # NEW: Pure TypeScript iPod database
│   ├── src/
│   │   ├── itunesdb/     # Binary parser/writer
│   │   │   ├── parser.ts       # Read iTunesDB → in-memory model
│   │   │   ├── writer.ts       # In-memory model → iTunesDB bytes
│   │   │   ├── records.ts      # Record type definitions (mhbd, mhit, etc.)
│   │   │   ├── strings.ts      # UTF-16LE string handling
│   │   │   └── checksum.ts     # hash58 computation
│   │   ├── artwork/      # Artwork database
│   │   │   ├── parser.ts       # Read ArtworkDB
│   │   │   ├── writer.ts       # Write ArtworkDB
│   │   │   ├── ithmb.ts        # .ithmb file read/write
│   │   │   └── formats.ts      # Device-specific format table
│   │   ├── device/       # Device identification
│   │   │   ├── sysinfo.ts      # SysInfo parser
│   │   │   └── models.ts       # Model capability table
│   │   ├── files/        # File management
│   │   │   ├── copy.ts         # Copy tracks to iPod
│   │   │   └── paths.ts        # Path generation and conversion
│   │   ├── database.ts   # High-level Database class (same API contract)
│   │   └── index.ts
│   └── __tests__/
├── libgpod-node/         # EXISTING: Keep during migration
└── podkit-core/          # Consumer: swap import path
```

### Migration Path

**Phase 1: Read-only parser** (weeks 1-4)
- Implement iTunesDB parser that can read databases created by libgpod
- Implement SysInfo parser and model table
- Validate by parsing databases from integration test fixtures
- **Milestone:** `ipod-db` can parse any iTunesDB that libgpod can

**Phase 2: Write support** (weeks 4-7)
- Implement iTunesDB writer
- Implement hash58 checksum
- Round-trip testing: parse → write → parse, compare with libgpod output byte-by-byte
- **Milestone:** `ipod-db` can read and write databases that libgpod accepts

**Phase 3: Artwork** (weeks 7-9)
- Implement artwork database parser/writer
- Implement .ithmb generation with sharp for image resizing
- RGB565 conversion for Video models, JPEG pass-through for Classic
- **Milestone:** Full artwork support matching libgpod capabilities

**Phase 4: Complete API and swap** (weeks 9-11)
- Implement remaining operations (smart playlists, chapters, photos)
- Create adapter matching libgpod-node's `Database` class interface
- Swap `@podkit/core` import from `@podkit/libgpod-node` to `@podkit/ipod-db`
- Run full test suite against new implementation
- **Milestone:** All existing tests pass with pure TypeScript backend

**Phase 5: Cleanup** (week 12)
- Remove `@podkit/libgpod-node`, `gpod-tool`, `gpod-testing` (or rewrite gpod-testing to use ipod-db)
- Remove prebuild CI workflow, binding.gyp, native build scripts
- Remove `tools/libgpod-macos/`, `tools/prebuild/`
- Update documentation, ADRs
- **Milestone:** No C/C++ in the repository

### Testing Strategy

**Round-trip validation** is the primary correctness mechanism:

```typescript
// 1. Create database with libgpod (during migration)
const libgpodDb = LibgpodDatabase.create();
libgpodDb.addTrack({ title: 'Test', artist: 'Artist' });
libgpodDb.save();

// 2. Parse with ipod-db
const parsed = IpodDb.parse(libgpodDb.getFilename());

// 3. Write with ipod-db
IpodDb.write(parsed, outputPath);

// 4. Parse output with libgpod
const roundTripped = LibgpodDatabase.openFile(outputPath);
assert.deepEqual(roundTripped.tracks, libgpodDb.tracks);
```

**Real hardware testing** is essential:
- Create database with `ipod-db`, copy to physical iPod, verify playback
- Test with iPod Video (5th/5.5th gen), iPod Classic (6th/7th gen), iPod Nano
- Verify artwork displays correctly
- Verify checksum is accepted by iPod Classic

**Existing test suite** (7,290 lines of integration tests) provides the API contract. All tests should be portable to the new implementation.

---

## Part 4: Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Data corruption from format misunderstanding** | Medium | Critical | Extensive round-trip testing against libgpod; never deploy without hardware testing |
| **Undocumented iTunesDB fields** | Medium | Medium | Use libgpod source as reference alongside wiki spec; preserve unknown fields byte-for-byte |
| **Checksum algorithm edge cases** | Low | High | Test against real iPod Classic hardware; algorithm is well-documented since 2007 |
| **Artwork format edge cases** | Medium | Low | Focus on the ~5 device generations podkit supports; graceful degradation (no artwork > crash) |
| **Smart playlist binary encoding** | Medium | Medium | Less documented than core format; use libgpod source as definitive reference |
| **Photo database format** | Medium | Low | Lower priority; can defer to a later phase |

### Strategic Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Effort underestimation** | Medium | Medium | Phased approach allows stopping after any phase with partial value |
| **Regressions during swap** | Medium | Medium | Side-by-side testing; keep libgpod-node as fallback during migration |
| **sharp introduces its own native dep** | N/A | Low | sharp's distribution is extremely mature; alternatively use WASM-based image processing |

### What We Lose

- **10+ years of edge case fixes** baked into libgpod. These must be rediscovered through testing.
- **Implicit compatibility** with rare iPod configurations we haven't explicitly tested.
- **Community knowledge** — libgpod is the reference implementation used by every Linux iPod tool.

### What We Gain

- **Zero native build requirements** for users (`npm install` just works)
- **Zero C++ toolchain** for contributors
- **Full JavaScript debugging** — no core dumps, proper stack traces
- **Correct behavior by design** — no workarounds for libgpod bugs
- **Maintainability** — TypeScript codebase with proper types, not C++ wrapping C with GLib
- **Test infrastructure simplification** — eliminate gpod-tool C binary; test databases are pure TypeScript
- **CI simplification** — eliminate 3-platform prebuild pipeline, static linking verification
- **Smaller package** — no prebuilt .node binaries (~5MB per platform)
- **Remove ~17,000 lines** of native binding infrastructure

---

## Part 5: Effort Estimate

### Summary

| Phase | Scope | Estimated Duration | Can Ship After? |
|-------|-------|--------------------|-----------------|
| **Phase 1: Read-only parser** | iTunesDB parser, SysInfo, model table | 3-4 weeks | No (read-only isn't useful alone) |
| **Phase 2: Write support** | iTunesDB writer, hash58, round-trip tests | 2-3 weeks | Partial (basic sync without artwork) |
| **Phase 3: Artwork** | ArtworkDB, .ithmb, image processing | 1-2 weeks | Yes (full music sync) |
| **Phase 4: Complete API** | Smart playlists, chapters, photos, API adapter | 1-2 weeks | Yes (full feature parity) |
| **Phase 5: Cleanup** | Remove libgpod-node, CI, build scripts, docs | 1 week | Yes (migration complete) |
| **Total** | | **8-12 weeks** | |

### Effort by Skill

| Skill | Hours | Notes |
|-------|-------|-------|
| Binary format reverse engineering | 40-60 | Reading specs + libgpod source |
| TypeScript implementation | 120-160 | Parser, writer, artwork, device |
| Test writing | 40-60 | Round-trip, unit, integration, hardware |
| Hardware testing | 10-20 | Physical iPod validation |
| Documentation and cleanup | 10-20 | ADR updates, docs, migration |
| **Total** | **220-320 hours** | **~5,000-7,500 lines of TypeScript** |

---

## Part 6: Alternatives to Full Replacement

### Alternative A: Keep libgpod, Improve Distribution

Invest in better prebuilt binary distribution instead of replacing libgpod.

**Approach:** Add more platforms (Windows, Linux arm64), improve caching, explore WASM compilation of libgpod.

**Pros:** Much less effort (~1-2 weeks). Keeps battle-tested C code.
**Cons:** Doesn't solve developer experience, debugging, or maintenance burden. WASM compilation of libgpod + GLib + GdkPixbuf is likely impractical.

### Alternative B: Compile libgpod to WASM

Use Emscripten to compile libgpod (and its GLib/GdkPixbuf dependencies) to WebAssembly.

**Pros:** Reuses existing C code. Single WASM binary for all platforms.
**Cons:** GLib and GdkPixbuf are large, complex dependencies with system assumptions. File I/O must be shimmed. Image processing perf unclear. Likely more effort than a clean TypeScript implementation, with worse results.

### Alternative C: Hybrid — TypeScript Parser, libgpod Writer

Implement only the read path in TypeScript, keep libgpod for writing (the riskier operation).

**Pros:** Reduces risk of data corruption. Read-only parser is useful for device inspection.
**Cons:** Still requires native bindings for writes. Doesn't achieve the primary goal of eliminating native dependencies.

### Alternative D: Use Existing TypeScript/JS iPod Libraries

Search for existing JavaScript implementations.

**Finding:** No mature, maintained JavaScript library exists for iTunesDB read/write. There are some abandoned parsers (read-only) but nothing production-quality. This would need to be built from scratch regardless.

---

## Part 7: References

### iPod Database Format

- [iPodLinux iTunesDB Specification](https://web.archive.org/web/20110514113255/http://ipl.derpapst.org/wiki/ITunesDB) — Field-level format documentation
- [iPodLinux ArtworkDB Specification](https://web.archive.org/web/20110916180019/http://ipl.derpapst.org/wiki/ArtworkDB) — Artwork database format
- [hash58 checksum algorithm](https://hardware.slashdot.org/story/07/09/17/135205/new-ipod-checksum-cracked-linux-supported) — iPod Classic checksum cracking

### Existing Implementations (Reference Code)

- [libgpod source](https://github.com/libgpod/libgpod) — C reference implementation (primary reference)
  - `src/itdb_itunesdb.c` — Core database parser/writer (~8,000 lines)
  - `src/itdb_artwork.c` — Artwork database (~2,000 lines)
  - `src/itdb_photoalbum.c` — Photo database
  - `src/itdb_device.c` — Device identification
  - `src/itdb_hash58.c` / `src/itdb_hashAB.c` — Checksum algorithms
- [GNUpod](https://www.gnu.org/software/gnupod/) — Perl implementation (proves scripting language feasibility)
- [gtkpod source](https://sourceforge.net/projects/gtkpod/) — GTK GUI using libgpod (shows API usage patterns)

### podkit Internal References

- [ADR-002: libgpod Binding Approach](adr-002-libgpod-binding.md) — Original decision to use N-API
- [docs/devices/ipod-internals.md](../docs/devices/ipod-internals.md) — iPod format documentation
- [docs/developers/libgpod.md](../docs/developers/libgpod.md) — libgpod integration guide
- [packages/libgpod-node/README.md](../packages/libgpod-node/README.md) — Behavioral deviations documentation

## Recommendation

The replacement is **technically feasible with no blockers**. The question is purely effort vs. value.

**Arguments for proceeding:**
- Native bindings are the single largest source of friction for both users and contributors
- libgpod is unmaintained; any future bug we discover requires working around in C++
- The set of iPod models is frozen — this is a finite, completable problem
- Phased approach allows incremental value delivery

**Arguments for deferring:**
- 8-12 weeks is significant investment for a project in active feature development
- Current bindings work; the pain is in distribution and developer experience, not functionality
- Risk of introducing regressions in a critical data path (users' music libraries)

If proceeding, the phased approach with round-trip testing against libgpod provides a safe migration path with rollback capability at every stage.
