---
id: doc-011
title: 'PRD: Transfer Mode'
type: other
created_date: '2026-03-23 13:54'
---
## Problem Statement

podkit's `fileMode` config option controls whether embedded artwork is stripped from or preserved in transcoded files. However, it only affects files that pass through FFmpeg — direct-copy formats (MP3, M4A) and ALAC→ALAC copies are completely unaffected. A user who sets `fileMode: 'optimized'` expecting uniform behavior across their mixed collection (FLAC, ALAC, MP3) gets inconsistent results: transcoded files have artwork stripped, but copied files retain all embedded data.

The naming is also too narrow. `fileMode` implies a property of individual files, but the user's intent is broader — it's about how the sync process should prioritize speed, storage efficiency, or file portability. The current two-tier system (`optimized` / `portable`) also doesn't capture the full range of user priorities: some users want the fastest possible sync and don't care about stripping artwork from copies, while others want every byte optimized for a capacity-constrained device.

Additionally, the system needs to be device-aware. iPods read artwork from an internal database, so embedded artwork is dead weight. But future devices (Rockbox, Echo Mini) read artwork directly from files — stripping it would degrade the playback experience. The transfer strategy must adapt to what the target device actually needs.

This PRD replaces three overlapping backlog tasks (TASK-190, TASK-191, TASK-192) with a unified design.

## Solution

Replace `fileMode` with `transferMode` — a three-tier config option that controls how files are prepared for the target device:

- **`fast`** (default) — Optimize for sync speed. Transcoded files have artwork stripped (simpler, smaller output). All copy-format files (MP3, M4A, ALAC→ALAC) use direct file copy with no extra processing.
- **`optimized`** — Optimize for device storage. Transcoded files have artwork stripped. Copy-format files are routed through FFmpeg with audio stream copy (`-c:a copy -vn`) to strip embedded artwork without re-encoding. Trades sync speed for space savings.
- **`portable`** — Optimize for file portability and correctness. Transcoded files preserve embedded artwork (`-c:v copy`). Copy-format files use direct file copy (artwork preserved naturally). Files are self-contained and usable outside the device ecosystem.

Transfer mode is a **property of the output file**, not the transcoding process. The user's intent applies uniformly to all files going to the device.

A `--force-transfer-mode` CLI flag allows users to re-process existing tracks when they change their transfer mode setting, without re-transcoding their entire library.

## User Stories

1. As a user with a mixed FLAC + MP3 collection, I want `transferMode: 'optimized'` to strip embedded artwork from all files (not just transcodes), so that I maximize usable space on my capacity-constrained iPod.
2. As a user who values fast syncing, I want a `fast` transfer mode that copies MP3/M4A files directly without extra processing, so that syncing my collection is as quick as possible.
3. As a user who sometimes pulls files off my iPod for use elsewhere, I want a `portable` transfer mode that preserves embedded artwork in all files, so that the files are self-contained and usable in any player.
4. As a user with ALAC source files and an ALAC-capable iPod, I want `optimized` mode to strip embedded artwork from ALAC→ALAC copies, so that these files don't waste space with artwork the iPod reads from its database.
5. As a user with ALAC source files, I want `fast` mode to direct-copy my ALAC files without any FFmpeg processing, so that syncing is as fast as possible.
6. As a user who changed my transfer mode from `fast` to `optimized`, I want to run `--force-transfer-mode` to re-process only tracks with a mismatched setting, so that I don't have to re-transcode my entire library with `--force-transcode`.
7. As a user running `--dry-run`, I want to see which tracks will use direct-copy vs optimized-copy vs transcode operations, so that I understand what processing will happen.
8. As a user, I want to set `transferMode` globally, per-device, via CLI flag, or via environment variable, so that I have flexible configuration options.
9. As a user, I want a tip telling me when existing tracks were synced with a different transfer mode, so that I know `--force-transfer-mode` is available.
10. As a future user with a Rockbox or Echo Mini device, I want transfer mode behavior to adapt to my device's capabilities (e.g., not stripping artwork if my device reads it from files), so that the output is always optimal for my specific device.
11. As a user syncing direct-copy formats (MP3, M4A), I want sync tags written to these tracks, so that the system can detect transfer mode mismatches and offer targeted re-processing.
12. As a user switching from the old `fileMode` to the new `transferMode`, I want clear changelog guidance to resync my device, so that I'm not confused by the breaking change.
13. As a user viewing the sync plan, I want to distinguish between "direct-copy" (fast file transfer) and "optimized-copy" (FFmpeg passthrough for artwork stripping) operations, so that I understand why some copies take longer than others.
14. As a user with a track that needs both a file update and an artwork update, I want to see a single operation (not two), so that the plan is clean and not confusing.

## Implementation Decisions

### Config Surface

- `transferMode: 'fast' | 'optimized' | 'portable'` replaces `fileMode: 'optimized' | 'portable'`
- Available at all config levels: global, per-device, CLI flag (`--transfer-mode`), environment variable (`PODKIT_TRANSFER_MODE`)
- Default value: `'fast'`
- `--force-transfer-mode` flag added to sync command (config: `forceTransferMode`, env: `PODKIT_FORCE_TRANSFER_MODE`)

### Transfer Mode as Output Property

Transfer mode defines user intent about the output. The sync engine decides how to fulfill that intent based on file type and device capabilities. This is not a transcoding concern — it applies to all files.

### Three-Tier Behavior (iPod / Database-Artwork Devices)

| Source Path | `fast` | `optimized` | `portable` |
|------------|--------|-------------|------------|
| FLAC→AAC transcode | Strip artwork | Strip artwork | Preserve artwork |
| FLAC→ALAC transcode | Strip artwork | Strip artwork | Preserve artwork |
| ALAC→ALAC copy | Direct copy | FFmpeg passthrough, strip artwork | Direct copy |
| MP3 copy | Direct copy | FFmpeg passthrough, strip artwork | Direct copy |
| M4A/AAC copy | Direct copy | FFmpeg passthrough, strip artwork | Direct copy |
| OGG/Opus→AAC transcode | Strip artwork | Strip artwork | Preserve artwork |

### Device Capabilities Abstraction

A `DeviceCapabilities` interface will be introduced for the sync engine to query device properties relevant to transfer decisions. For this implementation, iPod will be the only implementation (derived from existing generation metadata). The interface is designed for future devices to implement.

Key capabilities for transfer mode:
- `artworkSources`: Ordered array indicating where the device reads artwork from (`'database'`, `'embedded'`, `'sidecar'`). First entry is primary.
- `artworkMaxResolution`: Maximum artwork display resolution in pixels.
- `supportedAudioCodecs`: Which audio codecs the device can play natively.

Device-aware artwork behavior (resizing for embedded-artwork devices, sidecar creation) is **out of scope** for this implementation — it will ship with Echo Mini device support. The abstraction is designed now so it doesn't need to be retrofitted.

### Operation Types

The planner's operation vocabulary becomes more granular:

**Add operations:**
- `add-direct-copy` — file copied to device as-is
- `add-optimized-copy` — file routed through FFmpeg with audio stream copy for artwork processing
- `add-transcode` — full audio transcode

**Update operations:**
- `upgrade-direct-copy` — re-copy file to device
- `upgrade-optimized-copy` — re-copy through FFmpeg passthrough
- `upgrade-transcode` — full re-transcode
- `upgrade-artwork` — artwork-only update, no audio file change
- `update-metadata` — metadata-only update (existing, unchanged)

**Remove:**
- `remove` (existing, unchanged)

**Key rule:** One operation per track. File replacement subsumes artwork changes — if a track needs both a file update and artwork update, only the file operation is emitted.

### Sync Tags

- New field: `transfer=fast|optimized|portable` replaces `mode=optimized|portable`
- Sync tags are now written for **all track types**, including direct copies (previously only transcoded tracks had sync tags)
- No migration path for existing sync tags — users should resync. Changelog will note this as a breaking change.

### --force-transfer-mode

- New upgrade reason: `transfer-mode-changed`
- The differ checks each existing track's sync tag `transfer` field against the current `transferMode` setting
- Mismatched tracks are moved to `toUpdate` with the `transfer-mode-changed` reason
- v1 implementation re-processes tracks uniformly (same as a fresh add). Smart routing (using FFmpeg passthrough where a full re-transcode isn't needed) is a follow-up optimization.
- The `FILE_MODE_MISMATCH_TIP` is renamed and updated to recommend `--force-transfer-mode`

### Config Migration

Not needed. The only device in the wild is the developer's own. A changelog warning will advise users to resync if they experience issues after upgrading.

## Testing Decisions

Good tests for this feature verify external behavior (what operations the planner produces, what FFmpeg args are generated, what sync tags are written) without testing internal implementation details.

### Modules to Test

**FFmpeg argument building** — Verify that each transfer mode produces the correct FFmpeg arguments for each file type path. Prior art: existing `ffmpeg.test.ts` which tests `buildTranscodeArgs()` and `buildAlacArgs()` output. Extend with parameterized tests across all three transfer modes.

**Music planner** — Verify that the planner produces the correct operation types (`add-direct-copy` vs `add-optimized-copy` vs `add-transcode`) based on source format, quality preset, and transfer mode. Prior art: existing `music-planner.test.ts` with factory functions for collection tracks and iPod tracks.

**Sync tags** — Verify round-trip parsing/formatting of the new `transfer` field. Verify sync tags are built correctly for direct-copy operations. Prior art: existing `sync-tags.test.ts` with parameterized round-trip tests.

**Music differ / upgrades** — Verify that `transfer-mode-changed` reason is detected when sync tag transfer field mismatches current config. Verify interaction with other upgrade reasons (file replacement subsumes artwork). Prior art: existing `music-differ.test.ts` and `upgrades.test.ts`.

**Config loading** — Verify `transferMode` loads from config file, env var, CLI flag, and per-device config. Verify validation rejects invalid values. Prior art: existing `loader.test.ts` with temp directories and env var cleanup.

**Tips** — Verify the transfer mode mismatch tip fires with correct counts and messaging. Prior art: existing `tips.test.ts` with mock output objects.

**Device capabilities** — Verify iPod implementation returns correct capabilities based on generation. This is a new module but follows the same pure-function testing pattern used in `generation.ts`.

## Out of Scope

- **Device-aware artwork resizing/sidecar creation** — Will ship with Echo Mini device support. The `DeviceCapabilities` interface is designed now but artwork resize/sidecar operations are not implemented.
- **Smart `--force-transfer-mode` routing** — v1 re-processes uniformly. A future optimization could use FFmpeg passthrough instead of full re-transcode where the audio doesn't need re-encoding.
- **Sidecar artwork from collection adapters** — Collection adapters providing folder.jpg or other external artwork sources is tracked separately.
- **Config migration from `fileMode`** — No automated migration. Breaking change with changelog notice.
- **Improved dry-run/plan UX** — Operation type grouping, summarization, or other presentation improvements beyond showing the correct operation types.

## Further Notes

- The `fast` default preserves current behavior for most users — transcoded files already had artwork stripped (the old buggy `-vn` behavior that TASK-189 formalized), and copy files were always direct copies.
- The `DeviceCapabilities` interface should be designed with expansion in mind but only implement what transfer mode needs today. Avoid speculative fields.
- For Rockbox devices, capabilities may need to be user-provided rather than auto-detected, since Rockbox can run on many different hardware platforms with varying capabilities. The interface should accommodate both auto-detected and user-configured capabilities.
- This is a **minor version bump** for both `podkit` and `@podkit/core` — new feature, but the `fileMode` → `transferMode` rename is breaking for users who had `fileMode` in their config.
