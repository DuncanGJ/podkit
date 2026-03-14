---
"@podkit/libgpod-node": minor
"@podkit/core": minor
"podkit": minor
---

Add self-healing sync for changed and upgraded source files. Sync now detects when a source file has improved — format upgrade (MP3 replaced with FLAC), quality upgrade (higher bitrate), artwork added, Sound Check values changed, or metadata corrected — and upgrades the iPod track in place, preserving play counts, star ratings, and playlist membership.

Upgrades happen by default as part of normal sync. Use `--skip-upgrades` or the `skipUpgrades` config option to disable file-replacement upgrades when short on time or space. The `skipUpgrades` setting follows the standard resolution order (CLI flag → device config → global config → default).

Add `replaceTrackFile()` to `@podkit/libgpod-node` for replacing a track's audio file while preserving the database entry. The old file is deleted and libgpod generates a fresh path with the correct extension for the new format, ensuring the iPod firmware uses the right decoder.

Add `hasArtwork` field to `CollectionTrack` — populated by the directory adapter (from embedded pictures) and Subsonic adapter (from cover art metadata).

Fix copied tracks (MP3, M4A) not having their bitrate recorded in the iPod database, which is needed for quality-upgrade detection.

**Breaking:** `ConflictTrack` type and `SyncDiff.conflicts` array removed from `@podkit/core` — metadata conflicts are now handled as `metadata-correction` upgrades.
