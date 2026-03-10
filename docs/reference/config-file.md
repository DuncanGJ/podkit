---
title: Config File Reference
description: Complete reference for the podkit configuration file schema and options.
sidebar:
  order: 2
---

Complete reference for the podkit configuration file (`~/.config/podkit/config.toml`).

## File Location

Default location: `~/.config/podkit/config.toml`

Override with `--config <path>` or the `PODKIT_CONFIG` environment variable.

## Schema Overview

```toml
# Global defaults
quality = "high"             # alac | max | max-cbr | high | high-cbr | medium | medium-cbr | low | low-cbr
fallback = "max"             # Fallback for lossy sources when quality = "alac"
artwork = true               # Include album artwork

# Global transforms
[transforms.ftintitle]
enabled = false
drop = false
format = "feat. {}"
ignore = []

# Music collections
[music.<name>]
path = "/path/to/music"
type = "directory"           # or "subsonic"

# Video collections
[video.<name>]
path = "/path/to/videos"

# Devices
[devices.<name>]
volumeUuid = "..."
volumeName = "..."
quality = "high"
videoQuality = "high"
artwork = true

# Per-device transforms
[devices.<name>.transforms.ftintitle]
enabled = true

# Defaults
[defaults]
device = "myipod"
music = "main"
video = "movies"
```

## Global Settings

These apply to all devices unless overridden at the device level.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `quality` | string | `"high"` | Audio transcoding quality preset |
| `fallback` | string | `"max"` | Fallback preset for lossy sources when `quality = "alac"` |
| `artwork` | boolean | `true` | Include album artwork during sync |

## Music Collections

Each music collection is defined under `[music.<name>]` where `<name>` is an identifier you choose.

### Directory Source

```toml
[music.main]
path = "/path/to/music"
```

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `path` | string | yes | - | Path to the music directory |
| `type` | string | no | `"directory"` | Source type |

### Subsonic Source

```toml
[music.navidrome]
type = "subsonic"
url = "https://server.example.com"
username = "user"
password = "password"
path = "/cache/path"
```

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `type` | string | yes | - | Must be `"subsonic"` |
| `url` | string | yes | - | Subsonic server URL |
| `username` | string | yes | - | Subsonic username |
| `password` | string | no | - | Subsonic password (can also use env var) |
| `path` | string | yes | - | Local cache path for downloaded files |

The password can be provided via the config file, or through environment variables (see [Environment Variables](#environment-variables)).

## Video Collections

Each video collection is defined under `[video.<name>]`.

```toml
[video.movies]
path = "/path/to/movies"
```

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `path` | string | yes | Path to the video directory |

## Devices

Each device is defined under `[devices.<name>]`. Use `podkit device add <name>` to auto-detect and register a connected iPod.

```toml
[devices.classic]
volumeUuid = "ABCD-1234"
volumeName = "IPOD"
quality = "high"
videoQuality = "high"
artwork = true
```

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `volumeUuid` | string | yes | - | Volume UUID for device auto-detection |
| `volumeName` | string | no | - | Volume name for display |
| `quality` | string | no | global `quality` | Audio quality preset override |
| `videoQuality` | string | no | `"high"` | Video quality preset override |
| `artwork` | boolean | no | global `artwork` | Artwork override for this device |

### Per-Device Transforms

Devices can override global transform settings:

```toml
[devices.classic.transforms.ftintitle]
enabled = true
format = "feat. {}"
```

## Transforms

Global transform settings, applied to all devices unless overridden.

### ftintitle

Extracts featured artist information from the artist field and moves it to the title field.

```toml
[transforms.ftintitle]
enabled = true
drop = false
format = "feat. {}"
ignore = ["Simon & Garfunkel"]
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `false` | Whether the transform is active |
| `drop` | boolean | `false` | If `true`, drop featuring info entirely instead of moving to title |
| `format` | string | `"feat. {}"` | Format string for featuring text in title (`{}` is replaced with artist names) |
| `ignore` | string[] | `[]` | Artist names to ignore when splitting on ambiguous separators (`and`, `&`, `with`) |

## Defaults

Specifies which named collection and device to use when CLI flags are omitted.

```toml
[defaults]
device = "classic"
music = "main"
video = "movies"
```

| Key | Type | Description |
|-----|------|-------------|
| `device` | string | Default device name |
| `music` | string | Default music collection name |
| `video` | string | Default video collection name |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PODKIT_CONFIG` | Path to config file (overrides default location) |
| `PODKIT_QUALITY` | Default quality preset (overrides config file `quality`) |
| `PODKIT_FALLBACK` | Default fallback preset (overrides config file `fallback`) |
| `PODKIT_ARTWORK` | Default artwork setting (overrides config file `artwork`) |
| `PODKIT_MUSIC_<NAME>_PASSWORD` | Subsonic password for collection `<NAME>` (uppercase, hyphens become underscores) |
| `SUBSONIC_PASSWORD` | Fallback password for any Subsonic collection |

### Password Resolution Order

For a Subsonic collection named `navidrome`, the password is resolved in this order:

1. `password` field in config file
2. `PODKIT_MUSIC_NAVIDROME_PASSWORD` environment variable
3. `SUBSONIC_PASSWORD` environment variable

## Configuration Priority

Settings are merged from multiple sources in this order (later sources override earlier ones):

1. **Hardcoded defaults** - `quality = "high"`, `artwork = true`
2. **Config file** - `~/.config/podkit/config.toml`
3. **Environment variables** - `PODKIT_*`
4. **CLI arguments** - `--quality`, `--no-artwork`, etc.

Device-specific settings (`[devices.<name>]`) override global settings when that device is being used.

## Full Example

```toml
# Global defaults
quality = "high"
artwork = true

# Global transforms
[transforms.ftintitle]
enabled = true
format = "feat. {}"
ignore = ["Simon & Garfunkel", "Hall & Oates"]

# Music collections
[music.main]
path = "/Volumes/Media/music/library"

[music.vinyl-rips]
path = "/Volumes/Media/vinyl-rips"

[music.navidrome]
type = "subsonic"
url = "https://music.example.com"
username = "user"
path = "/tmp/navidrome-cache"

# Video collections
[video.movies]
path = "/Volumes/Media/movies"

[video.shows]
path = "/Volumes/Media/tv-shows"

# Devices
[devices.classic]
volumeUuid = "ABCD-1234"
volumeName = "CLASSIC"
quality = "high"
videoQuality = "high"
artwork = true

[devices.nano]
volumeUuid = "EFGH-5678"
volumeName = "NANO"
quality = "medium"
artwork = false

# Defaults
[defaults]
device = "classic"
music = "main"
video = "movies"
```

## See Also

- [Configuration Guide](/user-guide/configuration) - Practical configuration walkthrough
- [CLI Commands](/reference/cli-commands) - Command-line options
- [Quality Presets](/reference/quality-presets) - Audio and video quality details
