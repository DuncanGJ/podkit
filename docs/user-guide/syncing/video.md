---
title: Video Syncing
description: Supported video formats, content types, and how video syncing works in podkit.
sidebar:
  order: 3
---

podkit syncs movies and TV shows from your [video collections](/user-guide/collections) to iPods that support video playback.

## Supported Devices

Not all iPods support video. These models can play video:

- **iPod Video** — 5th and 5.5th generation
- **iPod Classic** — 6th and 7th generation
- **iPod Nano** — 3rd through 5th generation

See [Supported Devices](/devices/supported-devices) for the full compatibility matrix.

## Supported Input Formats

| Format | Extensions | Notes |
|--------|------------|-------|
| Matroska | `.mkv` | Common for rips |
| MP4 | `.mp4`, `.m4v` | May passthrough if already compatible |
| AVI | `.avi` | Legacy support |
| MOV | `.mov` | QuickTime |
| WebM | `.webm` | VP8/VP9 transcoded to H.264 |
| WMV | `.wmv` | Windows Media |

All videos are transcoded to iPod-compatible M4V (H.264 video, AAC audio). Files that are already compatible are copied directly without re-encoding. See [Video Transcoding](/user-guide/transcoding/video) for quality presets and device profiles.

## Supported Content Types

| Content Type | Supported | Notes |
|--------------|-----------|-------|
| **Movies** | Yes | Standalone films with optional director/studio metadata |
| **TV Shows** | Yes | Episodes with series, season, and episode information |
| **Music Videos** | Not yet | Planned for a future release |
| **Video Podcasts** | Not yet | Planned for a future release |

:::note[Want music video or video podcast support?]
If these content types are important to you, [open an issue on GitHub](https://github.com/jvgomg/podkit/issues) to help us prioritise.
:::

## Content Type Detection

podkit automatically determines whether a video is a movie or TV show using:

1. **Embedded tags** — If the file contains episode/season metadata
2. **Folder structure** — `TV Shows/Series Name/Season 01/`
3. **Filename patterns** — `S01E01`, `1x01`, etc.

If none of these match, the video is treated as a movie.

### Folder Organization

**Movies:**

```
Movies/
├── The Matrix (1999).mkv
├── Inception (2010)/
│   └── Inception.mkv
└── Sci-Fi/
    └── Blade Runner (1982).mkv
```

**TV Shows:**

```
TV Shows/
└── Breaking Bad/
    ├── Season 1/
    │   ├── S01E01 - Pilot.mkv
    │   └── S01E02 - Cat's in the Bag.mkv
    └── Season 2/
        └── S02E01 - Seven Thirty-Seven.mkv
```

## Setting Up Video Collections

Add a video source to your [config file](/user-guide/configuration):

```toml
[video.movies]
path = "/path/to/movies"

[video.shows]
path = "/path/to/tv-shows"

[defaults]
video = "movies"
```

## Syncing Commands

```bash
# Sync all video collections
podkit sync video

# Sync a specific collection
podkit sync video -c shows

# Preview changes
podkit sync video --dry-run

# Remove videos no longer in source
podkit sync video --delete

# Override quality for this sync
podkit sync video --video-quality medium

# Sync to a specific device (by name or mount path)
podkit sync video --device classic
```

## Listing Video

See what's on your iPod or in your collections:

```bash
# Video on your iPod
podkit device video

# Video in a collection
podkit collection video

# Output as JSON
podkit device video --format json
```

## See Also

- [Syncing Overview](/user-guide/syncing) — How syncing works
- [Video Transcoding](/user-guide/transcoding/video) — Quality presets, device profiles, and resolution handling
- [Quality Settings](/user-guide/devices/quality) — Per-device video quality configuration
- [Supported Devices](/devices/supported-devices) — Video-capable iPod models
