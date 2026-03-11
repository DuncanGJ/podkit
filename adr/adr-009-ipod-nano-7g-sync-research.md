---
title: "ADR-009: iPod Nano 7th Generation Sync Research"
description: Research into iPod nano 7th generation compatibility, database format differences, and third-party sync approaches.
sidebar:
  order: 10
---

# ADR-009: iPod Nano 7th Generation Sync Research

## Status

**Research** (2026-03-11)

## Context

podkit currently marks the iPod nano 6th and 7th generation as "Not Supported" because libgpod does not support their database format. Users have asked whether it's possible to sync with the nano 7th generation. This ADR captures research findings on the technical barriers, third-party approaches, and potential paths forward.

## Summary of Findings

**The iPod nano 7th generation cannot currently be synced via libgpod.** The core issue is that Apple changed the database format starting with the nano 6th generation, moving away from the binary iTunesDB format that libgpod understands. Some third-party tools on Windows have historically supported the device, and there is one experimental Linux project that demonstrates basic sync is technically achievable — but no mature open-source solution exists.

## Technical Analysis

### Database Format Change

Older iPods (nano 1st–5th, Classic, Mini, etc.) use the **iTunesDB** binary database format:

```
iPod_Control/iTunes/iTunesDB        # Binary track/playlist database (mhbd/mhit/mhod chunks)
iPod_Control/iTunes/iTunesCDB       # Companion database
```

Starting with the nano 5th generation, Apple introduced **SQLite-based databases** alongside iTunesDB:

```
iPod_Control/iTunes/iTunes Library.itlp/
├── Locations.itdb                  # SQLite database for track locations
├── Dynamic.itdb                    # Dynamic data (play counts, ratings)
├── Extras.itdb                     # Additional metadata
├── Genius.itdb                     # Genius playlist data
└── *.cbk                           # Checksum files for each .itdb
```

On the nano 5th gen, **both** formats coexist — libgpod writes the iTunesDB and then generates the SQLite databases from it. On the nano 6th and 7th gen, the **iTunesDB is no longer used** by the device firmware. Only the SQLite `.itdb` databases matter.

### The Checksum Problem

Each `.itdb` file is accompanied by a `.cbk` checksum file. The `Locations.itdb.cbk` file contains a cryptographic checksum that the iPod firmware validates on boot. If the checksum doesn't match, the iPod ignores the database and shows no music.

libgpod's checksum generation (`itdb_sqlite_generate_itdbs`) fails on the nano 7th gen with:

```
ERROR: Unsupported checksum type '0' in cbk file generation!
```

This indicates libgpod doesn't know how to compute the checksum variant used by this device. The checksum type is device-specific and varies across iPod generations.

### What Happens When You Try

When users attempt to sync a nano 7G with libgpod-based tools (gtkpod, Banshee, Rhythmbox):

1. The tool copies music files to `iPod_Control/Music/Fxx/` — this succeeds
2. The tool updates the iTunesDB — this succeeds but is ignored by the device
3. The tool attempts to generate SQLite databases — this fails with checksum errors
4. Files occupy space on the device but the iPod shows no new music

### HashInfo vs. Checksum

For nano 3rd–5th gen, the community solved a similar hash problem using **HashInfo files** (downloadable from `ihash.marcan.st`). These files contain device-specific secrets that let libgpod compute the correct iTunesDB hash. However, this mechanism only applies to the binary iTunesDB hash, **not** to the SQLite `.cbk` checksums used by the nano 6th/7th gen.

## Third-Party Approaches

### Windows/macOS Commercial Tools

Several commercial Windows tools claim nano 7G support:

| Tool | Platform | Status | Notes |
|------|----------|--------|-------|
| **CopyTrans Manager** | Windows | Works | Requires iTunes installed; reads/writes iPod database |
| **Syncios** | Windows | Discontinued for non-iOS | Dropped iPod nano/classic/shuffle support |
| **WALTR PRO** | macOS/Windows | Works | Universal Apple device transfer tool |
| **iMazing** | macOS/Windows | Works | Full device management |
| **Finder** (macOS) | macOS | Works | Built-in sync since macOS Catalina (replaced iTunes) |

These tools likely work by:
- Requiring iTunes/Apple frameworks to be installed (CopyTrans explicitly requires this)
- Using Apple's private frameworks or reverse-engineered iTunes database code
- Leveraging the iTunes COM/AppleScript interface rather than manipulating the database directly

### ipod7linux (Experimental Open-Source)

The most relevant project is [ipod7linux](https://github.com/i-malpha/ipod7linux) by `i-malpha`:

- **Language:** Vala (99.3%)
- **Dependencies:** ffmpeg, glib, gio, sqlite, vala
- **Approach:** Directly writes to the SQLite `.itdb` databases in `iTunes Library.itlp/`
- **Status:** Experimental, self-described as "some code to play with, by no means a complete solution"
- **Limitations:**
  - Incompatible with iTunes (can't coexist)
  - Minimal testing
  - No error handling
  - 3 commits, 0 stars, 0 forks

This project demonstrates that **the SQLite database format itself is not encrypted** — it's standard SQLite with a known schema. The challenge is the `.cbk` checksum files. It's unclear from the repository whether ipod7linux handles the checksums correctly or simply ignores them (which would mean the iPod might not show the music after a reboot).

### freemyipod Project (Firmware-Level)

The [freemyipod](https://freemyipod.org/) project has made significant progress on nano 7G at the firmware level:

- **S5Late exploit** (released 2024-12-16): A tethered bootrom/DFU exploit for the nano 7G
- **Custom firmware (CFW):** The wInd3x tool supports haxed DFU, firmware decrypt/dump, and CFW on nano 7G
- **Linux port:** Early work exists but has no storage, screen, or sound drivers yet

This is relevant because a custom firmware could theoretically bypass Apple's database checksum validation, but this path is far from practical — it would require running a custom OS on the iPod.

## Factors Needed for podkit Support

To support the iPod nano 7th generation, the following would need to be solved:

### 1. SQLite Database Schema (Difficulty: Medium)

The `.itdb` SQLite databases have a known schema. The ipod7linux project demonstrates that tracks can be inserted with standard SQLite operations. The schema would need to be fully documented and a writer implemented.

**Fields needed (minimum):** track location, title, artist, album, genre, duration, file type, sample rate, bit rate, artwork reference.

### 2. CBK Checksum Generation (Difficulty: High — Blocking)

This is the primary blocker. The `.cbk` checksum files must be correctly generated for the iPod to recognize the database. Options:

- **Reverse-engineer the checksum algorithm** from iTunes or the iPod firmware (most reliable)
- **Extract the algorithm** from a firmware dump using the S5Late exploit
- **Determine if ipod7linux solved this** (needs investigation — the project may have found the algorithm)
- **Bypass via custom firmware** (impractical for end users)

### 3. Artwork Database (Difficulty: Medium)

The artwork format on nano 6th/7th gen likely differs from older models. Would need investigation into whether artwork is stored in the SQLite databases or in separate files.

### 4. Device Detection (Difficulty: Low)

libgpod's model table would need entries for nano 7G model numbers. podkit would need to route these devices through a different code path (SQLite writer instead of libgpod's iTunesDB writer).

### 5. Testing (Difficulty: Medium)

Requires physical nano 7G hardware for validation. The dummy iPod test infrastructure in podkit would need to support the SQLite database format.

## Recommendation

**Do not pursue nano 7G support at this time.** The technical barriers are significant:

1. The `.cbk` checksum algorithm is the primary blocker and would require substantial reverse-engineering effort
2. The ipod7linux project shows it's theoretically possible but hasn't attracted community interest (0 stars, 3 commits)
3. The nano 7G is discontinued hardware with a shrinking user base
4. Commercial tools that support it rely on Apple's proprietary frameworks

**If this is revisited in the future**, the recommended approach would be:

1. Investigate ipod7linux more deeply — determine if it actually handles checksums
2. Use the S5Late exploit to dump and analyze the nano 7G firmware's database validation code
3. Implement a standalone SQLite-based database writer (separate from libgpod) as a new adapter in podkit-core
4. This would be a substantial effort, likely requiring a dedicated native module or FFI to a C/Vala library

## References

- [iPod nano 7G on freemyipod wiki](https://freemyipod.org/wiki/Main_Page)
- [S5Late bootrom exploit](https://freemyipod.org/wiki/S5Late)
- [ipod7linux project](https://github.com/i-malpha/ipod7linux)
- [libgpod README.sqlite](https://github.com/hyperair/libgpod/blob/master/README.sqlite) — documents the SQLite database format
- [gtkpod mailing list — nano 7G support](https://sourceforge.net/p/gtkpod/mailman/message/30329260/)
- [ArchWiki — iPod](https://wiki.archlinux.org/title/IPod)
- [HashInfo generator](https://ihash.marcan.st/) — for older iPod hash bypass (not applicable to nano 7G)
- [Linux Mint Forums — nano 7G transfer failure](https://forums.linuxmint.com/viewtopic.php?t=207951)
