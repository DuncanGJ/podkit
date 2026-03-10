---
title: Transcoding Methodology
description: How podkit decides what to transcode and its approach to preserving quality.
sidebar:
  order: 1
---

podkit's goal is to get your media onto your iPod at the best possible quality. It only transcodes what it needs to — compatible files are copied as-is, and output quality is never higher than the source.

## Core Principles

### Only Transcode What's Necessary

Not every file needs transcoding. podkit categorizes each source file and takes the minimum action:

| Source Type | Examples | What Happens |
|-------------|----------|--------------|
| **Lossless** | FLAC, WAV, AIFF, ALAC | Transcoded to your chosen preset |
| **Compatible lossy** | MP3, M4A (AAC) | Copied directly — no re-encoding |
| **Incompatible lossy** | OGG, Opus | Transcoded + lossy-to-lossy warning |

**Why copy compatible lossy files?** Re-encoding MP3 to AAC only loses quality. Even "upconverting" 128 kbps MP3 to 256 kbps AAC wastes space without improving audio. podkit avoids this entirely.

### Source Quality Awareness

podkit analyzes source files and caps output quality accordingly. Low-quality sources won't be wastefully upscaled:

| Source Quality | Your Setting | Effective Output |
|----------------|--------------|------------------|
| High-quality source | `high` | Full quality at preset bitrate |
| Low-quality source | `high` | Capped to source quality |

This applies to both audio and video. For video, resolution is also matched to device capabilities — a 1080p source is scaled down to 640x480 for iPod Classic, not upscaled.

### Lossy-to-Lossy Warnings

When podkit encounters incompatible lossy files (OGG, Opus) that must be re-encoded, it warns you during `--dry-run`. This is an unavoidable quality trade-off — you can decide whether to accept it or convert those files to a compatible format beforehand.

## Passthrough

If a file is already fully compatible with the target device, podkit copies it without any processing. For audio, this means MP3 and AAC files. For video, this means H.264/AAC in an MP4/M4V container that fits within the device's resolution and bitrate limits.

The dry run shows what will happen to each file:

```
+ [transcode    ] Artist - Song.flac
+ [copy         ] Artist - Track.mp3
+ [transcode    ] Movie.mkv
+ [passthrough  ] Compatible.m4v
```

## Metadata Preservation

podkit preserves metadata through transcoding:

- All standard tags (title, artist, album, track number, disc number, year, genre)
- Album artwork (embedded in output file)
- Video content type detection (movie vs. TV show)

## Quality Configuration

Audio and video quality are configured independently. Audio quality can be set globally or per device. Video quality is set per device or on the command line:

```toml
# Global audio quality
quality = "high"

# Per-device overrides for audio and video
[devices.classic]
quality = "max"
videoQuality = "high"

[devices.nano]
quality = "medium"
videoQuality = "low"
```

```bash
# Environment variable (audio quality only)
export PODKIT_QUALITY=medium

# Command-line overrides
podkit sync --quality medium
podkit sync --video-quality low
```

Audio and video have separate quality presets suited to their formats. See the detailed guides:

- **[Audio Transcoding](/user-guide/transcoding/audio)** — AAC presets, VBR vs CBR, encoder selection, file size estimates
- **[Video Transcoding](/user-guide/transcoding/video)** — Device profiles, resolution handling, H.264 settings, hardware acceleration
