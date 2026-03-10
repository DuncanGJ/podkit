---
title: Configuration
description: Configure podkit with collections, devices, quality presets, and sync options.
sidebar:
  order: 1
---

podkit uses a TOML configuration file located at `~/.config/podkit/config.toml`. This guide covers all configuration options.

## Creating the Config File

Generate a default configuration:

```bash
podkit init
```

Or create manually:

```bash
mkdir -p ~/.config/podkit
touch ~/.config/podkit/config.toml
```

## Basic Configuration

A minimal configuration with one music collection and one device:

```toml
# Music collection
[music.main]
path = "/path/to/your/music"

# Device
[devices.myipod]
volumeUuid = "ABC-123"      # Auto-detected by 'podkit device add'
volumeName = "IPOD"

# Defaults
[defaults]
device = "myipod"
music = "main"
```

## Music Collections

Define multiple music sources:

```toml
[music.main]
path = "/Volumes/Media/music/library"

[music.vinyl-rips]
path = "/Volumes/Media/vinyl-rips"

[music.work]
path = "/Users/me/Music/work-playlist"
```

Sync a specific collection:

```bash
podkit sync -c vinyl-rips
```

### Subsonic Collections

Connect to Subsonic-compatible servers (Navidrome, Airsonic, Gonic):

```toml
[music.navidrome]
type = "subsonic"
url = "https://your-server.example.com"
username = "your-username"
password = "your-password"           # Or use environment variable
path = "/path/to/download/cache"     # Local cache for streaming
```

For passwords, you can also use environment variables:

```bash
# For collection named "navidrome"
export PODKIT_MUSIC_NAVIDROME_PASSWORD="your-password"
```

See [Subsonic Source](/user-guide/collection-sources/subsonic) for full Subsonic configuration.

## Devices

### Adding Devices

Register a connected iPod:

```bash
podkit device add myipod
```

This auto-detects the device and adds it to your config:

```toml
[devices.myipod]
volumeUuid = "ABC-123-DEF-456"
volumeName = "IPOD"
```

### Device Settings

Configure per-device options:

```toml
[devices.classic]
volumeUuid = "ABC-123"
volumeName = "CLASSIC"
quality = "high"          # Transcoding quality
artwork = true            # Include album artwork

[devices.nano]
volumeUuid = "DEF-456"
volumeName = "NANO"
quality = "medium"        # Lower quality for less storage
artwork = false           # Skip artwork for faster sync
```

## Quality Presets

Configure transcoding quality as top-level settings:

```toml
quality = "high"          # alac | max | high | medium | low
fallback = "max"          # Fallback for lossy sources when using ALAC
```

| Preset | Type | Target Bitrate | Description |
|--------|------|----------------|-------------|
| `alac` | Lossless | N/A | Apple Lossless (from lossless sources only) |
| `max` | VBR | ~320 kbps | Highest VBR quality |
| `high` | VBR | ~256 kbps | Transparent quality (default) |
| `medium` | VBR | ~192 kbps | Excellent quality |
| `low` | VBR | ~128 kbps | Good quality, space-efficient |

CBR variants are also available: `max-cbr`, `high-cbr`, `medium-cbr`, `low-cbr`.

See [Audio Transcoding](/user-guide/transcoding/audio) for detailed quality settings.

## Video Collections

Configure video sources for iPods that support video:

```toml
[video.movies]
path = "/path/to/movies"

[video.shows]
path = "/path/to/tv-shows"

[defaults]
video = "movies"
```

See [Video Transcoding](/user-guide/transcoding/video) for video configuration.

## Defaults

Set default values for CLI commands:

```toml
[defaults]
device = "myipod"         # Default device name
music = "main"            # Default music collection
video = "movies"          # Default video collection
```

Override defaults on the command line:

```bash
podkit sync --device nano --quality medium -c vinyl-rips
```

## Transforms

Transforms modify track metadata during sync. They are configured globally and can be overridden per-device.

### ftintitle

Extracts featured artist information from the artist field and appends it to the title. This is useful when your music library stores "Artist feat. Other Artist" in the artist field but you want the iPod to show "Artist" as the artist and "Song (feat. Other Artist)" as the title.

```toml
[transforms.ftintitle]
enabled = true            # Move "feat." from artist to title
drop = false              # If true, drop featuring info entirely
format = "feat. {}"       # Format string for title
ignore = ["Simon & Garfunkel"]  # Don't split these artist names
```

The `ignore` list prevents artist names containing ambiguous separators (`&`, `and`, `with`) from being incorrectly split.

To override transforms for a specific device:

```toml
[devices.nano.transforms.ftintitle]
enabled = false           # Disable for this device
```

See [Transforms](/user-guide/transforms) for all available transforms.

## Environment Variables

Some settings can be set via environment variables:

| Variable | Description |
|----------|-------------|
| `PODKIT_CONFIG` | Path to config file |
| `PODKIT_QUALITY` | Default quality preset |
| `PODKIT_FALLBACK` | Default fallback preset |
| `PODKIT_ARTWORK` | Default artwork setting |
| `PODKIT_MUSIC_{NAME}_PASSWORD` | Password for Subsonic collection (NAME is uppercased, hyphens become underscores) |
| `SUBSONIC_PASSWORD` | Fallback password for any Subsonic collection |

## Full Example

```toml
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

# Global transcoding settings
quality = "high"
fallback = "max"

# Devices
[devices.classic]
volumeUuid = "ABCD-1234"
volumeName = "CLASSIC"
quality = "high"
artwork = true

[devices.nano]
volumeUuid = "EFGH-5678"
volumeName = "NANO"
quality = "medium"
artwork = false

# Transforms
[transforms.ftintitle]
enabled = true
format = "feat. {}"

# Defaults
[defaults]
device = "classic"
music = "main"
video = "movies"
```

## See Also

- [Directory Source](/user-guide/collection-sources/directory) - Local directory source configuration
- [Subsonic Source](/user-guide/collection-sources/subsonic) - Subsonic server source configuration
- [Audio Transcoding](/user-guide/transcoding/audio) - Quality presets and encoder settings
- [Video Transcoding](/user-guide/transcoding/video) - Video collection configuration
- [CLI Commands](/reference/cli-commands) - Command-line options
- [Config File Reference](/reference/config-file) - Complete config schema
