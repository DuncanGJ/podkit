---
id: doc-014
title: 'Spec: Operation Types & Sync Tags'
type: other
created_date: '2026-03-23 13:56'
---
## Overview

This spec defines the planner's operation vocabulary, how the planner decides between operation types, and the changes to sync tag format needed to support transfer mode tracking across all file types.

**Parent document:** PRD: Transfer Mode (DOC-011)

## Operation Types

### Current state

The planner currently produces these operation types:

- `copy` — direct file copy (MP3, M4A, ALAC→ALAC)
- `transcode` — FFmpeg transcode with a preset (FLAC→AAC, etc.)
- `upgrade` — file replacement update, with a `reason` and optional `preset`
- `update-metadata` — metadata-only update, no file change
- `remove` — track removal

The `copy` vs `transcode` distinction is determined by whether a `preset` is present. The `upgrade` type overloads both copy and transcode paths via the same mechanism.

### New state

Operations become more explicit about the transfer method:

**Add operations:**

| Type | Description | When used |
|------|-------------|-----------|
| `add-direct-copy` | File copied byte-for-byte to device | Copy-format files in `fast` or `portable` mode |
| `add-optimized-copy` | File routed through FFmpeg with `-c:a copy` for artwork manipulation | Copy-format files in `optimized` mode |
| `add-transcode` | Full audio transcode via FFmpeg | Lossless→lossy, incompatible lossy, lossless→ALAC (non-ALAC source) |

**Update operations:**

| Type | Description | When used |
|------|-------------|-----------|
| `upgrade-direct-copy` | Re-copy file to device | Source file changed, copy format, `fast`/`portable` mode |
| `upgrade-optimized-copy` | Re-process through FFmpeg passthrough | Source file changed or transfer mode changed, copy format, `optimized` mode |
| `upgrade-transcode` | Full re-transcode | Source file changed or transfer mode changed, transcode format |
| `upgrade-artwork` | Artwork-only update, no audio file change | Artwork hash changed, no other changes |
| `update-metadata` | Metadata-only update (unchanged) | Tag changes, transform changes, soundcheck |

**Remove:**

| Type | Description |
|------|-------------|
| `remove` | Track removal (unchanged) |

### Decision logic

The planner decides the operation type using this flow:

```
1. Categorize source: lossless | compatible-lossy | incompatible-lossy
2. Determine if transcode is needed (based on category + device codec support + quality preset)
3. If transcode needed → add-transcode / upgrade-transcode
4. If no transcode needed (copy path):
   a. Check transferMode
   b. If 'optimized' → add-optimized-copy / upgrade-optimized-copy
   c. If 'fast' or 'portable' → add-direct-copy / upgrade-direct-copy
```

For upgrade operations, the same logic applies but is triggered by an upgrade reason (source-changed, force-transcode, transfer-mode-changed, etc.).

### One operation per track rule

If a track has multiple reasons for update (e.g., source file changed AND artwork changed), only one operation is emitted. Priority:

1. File replacement operations (upgrade-transcode, upgrade-optimized-copy, upgrade-direct-copy) — these naturally re-process artwork as part of the file operation
2. Artwork-only operations (upgrade-artwork) — only emitted when no file replacement is needed
3. Metadata-only operations (update-metadata) — only emitted when no file or artwork change is needed

The differ may produce multiple reasons for a single track. The planner collapses these into the highest-priority operation.

## Sync Tags

### Current format

```
[podkit:v1 quality=high encoding=vbr art=a1b2c3d4 mode=optimized]
```

- Written only for transcoded files
- `mode` field stores `optimized` or `portable`
- `mode` is informational only — `syncTagMatchesConfig()` ignores it

### New format

```
[podkit:v1 quality=high encoding=vbr art=a1b2c3d4 transfer=fast]
```

Changes:
- `mode=` field renamed to `transfer=`
- Values: `fast`, `optimized`, `portable`
- Written for **all track types**, including direct copies
- `transfer` field is checked by `syncTagMatchesConfig()` when `--force-transfer-mode` is active (but ignored during normal diff to avoid unnecessary re-processing)

### Sync tags for direct-copy tracks

Currently, only transcoded tracks have sync tags because the sync tag is built from transcode parameters (quality, encoding, bitrate). Direct-copy tracks need sync tags too, so the system can:

1. Detect transfer mode mismatches for `--force-transfer-mode`
2. Track artwork hash for change detection on copy-format files

A copy-format sync tag contains fewer fields:

```
[podkit:v1 quality=copy art=a1b2c3d4 transfer=fast]
```

- `quality=copy` indicates the file was not transcoded
- No `encoding` or `bitrate` fields (not applicable)
- `art` and `transfer` fields work the same as for transcoded tracks

### Building sync tags

The `buildAudioSyncTag()` function gains awareness of copy operations:

**For transcoded tracks** (unchanged pattern):
```
buildAudioSyncTag('high', 'vbr', undefined, 'fast')
→ { quality: 'high', encoding: 'vbr', transferMode: 'fast' }
```

**For copy tracks** (new):
```
buildCopySyncTag('fast', artworkHash)
→ { quality: 'copy', transferMode: 'fast', artworkHash }
```

A new `buildCopySyncTag()` function (or an extension to the existing builder) handles the copy case.

### Sync tag comparison

`syncTagMatchesConfig()` currently ignores the `mode` field entirely. With the rename:

- **Normal sync:** `transfer` field is still ignored during comparison. A transfer mode change alone does not trigger re-processing.
- **With `--force-transfer-mode`:** The differ explicitly checks `syncTag.transferMode !== currentTransferMode` and adds tracks to `toUpdate` with reason `transfer-mode-changed`. This is a separate check from `syncTagMatchesConfig()`.

This preserves the current design where informational sync tag fields don't trigger automatic re-processing — the user must opt in with a force flag.

## --force-transfer-mode Integration

### Differ changes

The differ gains a new check, gated by the `forceTransferMode` option:

```
For each existing (matched) track:
  1. Parse sync tag from iPod track comment
  2. Extract transfer mode: syncTag.transferMode ?? 'fast' (legacy default)
  3. If transferMode !== config.effectiveTransferMode:
     → Move to toUpdate with reason 'transfer-mode-changed'
```

### Upgrade reason

`'transfer-mode-changed'` is added to the `UpgradeReason` union type. It is a file-replacement upgrade — the planner routes it through the standard add logic to determine whether it becomes an `upgrade-transcode`, `upgrade-optimized-copy`, or `upgrade-direct-copy`.

### Interaction with other force flags

- `--force-transcode` re-transcodes all lossless-source tracks. It is a superset of `--force-transfer-mode` for transcoded tracks, but does NOT affect copy-format tracks.
- `--force-transfer-mode` re-processes tracks with mismatched transfer mode, including copy-format tracks. It is complementary to `--force-transcode`.
- Using both flags together: each track is processed once (the planner collapses duplicate reasons).

### Tip update

The existing `FILE_MODE_MISMATCH_TIP` is renamed to `TRANSFER_MODE_MISMATCH_TIP`:

- Counts tracks whose sync tag `transfer` field doesn't match current `transferMode`
- Message recommends `--force-transfer-mode` to re-process mismatched tracks
- Legacy sync tags (missing `transfer` field) are treated as `transfer=fast` to avoid false positives for existing users

## Migration

No automated migration. Sync tags using the old `mode=` field will not be recognized as having a `transfer` value — they'll be treated as `transfer=fast` (the legacy default). This is acceptable because the only device in the wild will be resynced from scratch.

The changelog should note:
- `fileMode` config option renamed to `transferMode`
- New `fast` default replaces old `optimized` default
- `--file-mode` CLI flag renamed to `--transfer-mode`
- `PODKIT_FILE_MODE` env var renamed to `PODKIT_TRANSFER_MODE`
- Recommend full resync after upgrading
