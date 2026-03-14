---
title: Track Upgrades
description: How podkit detects and upgrades improved source files during sync.
sidebar:
  order: 5
---

When you improve your music collection — replacing MP3s with lossless files, adding artwork, or fixing metadata — podkit detects these changes and upgrades the tracks on your iPod automatically. Play counts, star ratings, and playlist membership are preserved.

## How It Works

During sync, podkit compares metadata between your source files and the tracks already on your iPod. When it finds a matched track where the source has meaningfully improved, it upgrades the iPod copy in place rather than removing and re-adding it.

This detection uses metadata fields (format, bitrate, artwork presence, Sound Check values, genre, year, etc.) rather than file hashing or modification times, so it works with both local directories and remote Subsonic sources.

## Upgrade Categories

podkit recognizes several types of improvements:

| Category | Example | What happens |
|----------|---------|--------------|
| **Format upgrade** | MP3 replaced with FLAC | New file transcoded and copied to iPod |
| **Quality upgrade** | 128 kbps re-ripped at 320 kbps | New file transcoded and copied to iPod |
| **Artwork added** | Artwork embedded into previously bare files | New file copied with artwork |
| **Sound Check update** | ReplayGain tags added to collection | Metadata updated (no file transfer) |
| **Metadata correction** | Genre, year, or track numbers fixed | Metadata updated (no file transfer) |

File-replacement upgrades (format, quality, artwork) require transferring a new audio file to the iPod. Metadata-only updates (Sound Check, metadata corrections) are instant since they only touch the iPod database.

## Preserved User Data

Upgrades preserve everything about the track's history on the iPod:

- Play counts
- Star ratings
- Skip counts
- Playlist membership
- Date added

This is possible because podkit updates the existing database entry rather than deleting and recreating it.

## Dry-Run Output

Use `--dry-run` to preview upgrades before they happen:

```bash
podkit sync --dry-run
```

```
Sync plan:
  Add:       5 tracks
  Remove:    2 tracks
  Upgrade:  12 tracks
    Format upgrade:     8  (MP3 → FLAC)
    Artwork added:      3
    Sound Check update: 1
  Unchanged: 1,397 tracks
```

## Skipping Upgrades

Upgrades are on by default. To skip file-replacement upgrades (for example, on a device with limited storage), use the `--skip-upgrades` flag:

```bash
podkit sync --skip-upgrades
```

Or set it in your config file, either globally or per device:

```toml
# Skip upgrades on all devices
skipUpgrades = true

# Or skip upgrades on a specific device
[devices.nano]
volumeUuid = "EFGH-5678"
skipUpgrades = true    # Nano has limited space
```

When upgrades are skipped, dry-run still reports available upgrades so you can see what you are missing.

## See Also

- [Music Syncing](/user-guide/syncing/music) — How music syncing works
- [Sound Check](/user-guide/syncing/sound-check) — Volume normalization
- [Config File Reference](/reference/config-file) — `skipUpgrades` option
- [CLI Commands](/reference/cli-commands) — `--skip-upgrades` flag
