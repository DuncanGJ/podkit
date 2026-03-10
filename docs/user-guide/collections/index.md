---
title: Collection Sources
description: Overview of music and video collection sources supported by podkit.
sidebar:
  order: 1
---

podkit syncs media from **collection sources** — locations where your music or video files live. Each source is configured as a named collection in your config file and can be synced independently.

## Source Types

podkit currently supports two source types:

| Type | Description | Config `type` field |
|------|-------------|---------------------|
| [Directory](/user-guide/collection-sources/directory) | Local filesystem path containing audio/video files | *(default, no type needed)* |
| [Subsonic](/user-guide/collection-sources/subsonic) | Subsonic-compatible server (Navidrome, Airsonic, Gonic) | `"subsonic"` |

## Music vs Video Collections

Collections are defined under `[music.*]` or `[video.*]` sections in the config file:

```toml
# Music collections
[music.main]
path = "/Volumes/Media/music/library"

[music.navidrome]
type = "subsonic"
url = "https://music.example.com"
username = "user"
path = "/tmp/navidrome-cache"

# Video collections
[video.movies]
path = "/Volumes/Media/movies"
```

Music and video collections are synced together by default, or independently:

```bash
# Sync everything
podkit sync

# Sync only music
podkit sync music

# Sync a specific collection
podkit sync music -c main
```

## Adding Collections

Use the CLI to add a new collection:

```bash
# Add a directory source
podkit collection add music main /path/to/your/music

# Add a Subsonic source (configure in config file)
```

Or edit `~/.config/podkit/config.toml` directly.

## Multiple Collections

You can define as many collections as you need. Each gets a name and can be synced independently or together. See [Configuration](/user-guide/configuration) for examples of multi-collection setups.
