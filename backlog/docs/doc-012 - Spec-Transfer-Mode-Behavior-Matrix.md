---
id: doc-012
title: 'Spec: Transfer Mode Behavior Matrix'
type: other
created_date: '2026-03-23 13:55'
---
## Overview

This spec defines the exact behavior of each `transferMode` value for every file type path through the sync engine. It serves as the definitive reference for planner and executor implementation.

**Parent document:** PRD: Transfer Mode (DOC-011)

## Terminology

- **Direct copy**: File is copied byte-for-byte to the device. No FFmpeg involvement.
- **Optimized copy**: File is routed through FFmpeg with audio stream copy (`-c:a copy`) and artwork manipulation. Audio is not re-encoded.
- **Transcode**: File is decoded and re-encoded to a different codec/bitrate via FFmpeg.
- **Database artwork device**: Device reads artwork from an internal database, not from embedded file data (e.g., iPod via libgpod).
- **Embedded artwork device**: Device reads artwork from data embedded in the audio file (e.g., Rockbox, most DAPs).
- **Sidecar artwork device**: Device reads artwork from a file alongside the audio file, e.g., `folder.jpg` (e.g., some Rockbox themes, Echo Mini).

## Behavior Matrix: Database Artwork Devices (iPod)

This is the only matrix implemented in v1. iPods read artwork via `track.setArtworkFromData()` into their internal database. Embedded artwork in files is dead weight.

| Source → Target | `fast` | `optimized` | `portable` |
|----------------|--------|-------------|------------|
| FLAC → AAC | Transcode, strip artwork | Transcode, strip artwork | Transcode, preserve artwork |
| FLAC → ALAC | Transcode, strip artwork | Transcode, strip artwork | Transcode, preserve artwork |
| WAV → AAC | Transcode, strip artwork | Transcode, strip artwork | Transcode, preserve artwork |
| AIFF → AAC | Transcode, strip artwork | Transcode, strip artwork | Transcode, preserve artwork |
| ALAC → ALAC | Direct copy | Optimized copy, strip artwork | Direct copy |
| MP3 → MP3 | Direct copy | Optimized copy, strip artwork | Direct copy |
| M4A/AAC → M4A/AAC | Direct copy | Optimized copy, strip artwork | Direct copy |
| OGG → AAC | Transcode, strip artwork | Transcode, strip artwork | Transcode, preserve artwork |
| Opus → AAC | Transcode, strip artwork | Transcode, strip artwork | Transcode, preserve artwork |

**Key observations:**
- `fast` and `optimized` behave identically for transcodes (always strip — faster encode, smaller file)
- `fast` and `portable` behave identically for copies (both are direct copy, no FFmpeg)
- `optimized` is the only mode that introduces FFmpeg processing for copy-format files
- `portable` is the only mode that preserves artwork in transcoded output

## FFmpeg Arguments by Path

### Transcode paths (FLAC/WAV/AIFF → AAC)

**`fast` / `optimized` (strip artwork):**
```
-i <input> -c:a aac -q:a <quality> -ar 44100 -map_metadata 0 -vn -f ipod -y -progress pipe:1 <output>
```

**`portable` (preserve artwork):**
```
-i <input> -c:a aac -q:a <quality> -ar 44100 -map_metadata 0 -c:v copy -disposition:v attached_pic -f ipod -y -progress pipe:1 <output>
```

### Transcode paths (FLAC/WAV/AIFF → ALAC)

**`fast` / `optimized` (strip artwork):**
```
-i <input> -c:a alac -ar 44100 -map_metadata 0 -vn -f ipod -y -progress pipe:1 <output>
```

**`portable` (preserve artwork):**
```
-i <input> -c:a alac -ar 44100 -map_metadata 0 -c:v copy -disposition:v attached_pic -f ipod -y -progress pipe:1 <output>
```

### Optimized copy paths (ALAC → ALAC, strip artwork)

```
-i <input> -c:a copy -map_metadata 0 -vn -f ipod -y -progress pipe:1 <output>
```

### Optimized copy paths (MP3 → MP3, strip artwork)

```
-i <input> -c:a copy -map_metadata 0 -vn -y -progress pipe:1 <output>
```

Note: MP3 output does not use `-f ipod` container format. The output format is inferred or explicitly set to MP3.

### Optimized copy paths (M4A/AAC → M4A/AAC, strip artwork)

```
-i <input> -c:a copy -map_metadata 0 -vn -f ipod -y -progress pipe:1 <output>
```

### Direct copy paths

No FFmpeg involvement. Standard file copy operation.

## Behavior Matrix: Embedded Artwork Devices (Future)

For devices that read artwork from embedded file data. The key difference: stripping artwork degrades the experience, so `optimized` resizes rather than strips.

| Source → Target | `fast` | `optimized` | `portable` |
|----------------|--------|-------------|------------|
| FLAC → target codec | Transcode, resize artwork to device max | Transcode, resize artwork to device max | Transcode, preserve full-res artwork |
| Lossless copy | Direct copy | Optimized copy, resize artwork | Direct copy |
| Lossy copy | Direct copy | Optimized copy, resize artwork | Direct copy |

**Not implemented in v1.** The `DeviceCapabilities` interface is designed to support this, but the resize/embed logic ships with Echo Mini device support.

## Behavior Matrix: Sidecar Artwork Devices (Future)

For devices that read artwork from sidecar files (e.g., `folder.jpg`) in preference to embedded data.

| Source → Target | `fast` | `optimized` | `portable` |
|----------------|--------|-------------|------------|
| Any transcode | Transcode, strip embedded; create device-res sidecar | Transcode, strip embedded; create device-res sidecar | Transcode, preserve embedded; create device-res sidecar |
| Any copy | Direct copy; create device-res sidecar | Optimized copy, strip embedded; create device-res sidecar | Direct copy; create device-res sidecar |

**Not implemented in v1.** Sidecar creation ships with Echo Mini device support.

## Edge Cases

### Source file has no embedded artwork
All modes behave identically — no artwork to strip, resize, or preserve. Transcode and copy proceed without artwork flags. The `-vn` flag is still safe to include (it's a no-op when there's no video/image stream).

### Source file has multiple image streams
FFmpeg's `-vn` strips all video/image streams. `-c:v copy` copies the first video stream. This matches current behavior and is acceptable.

### Incompatible lossy sources (OGG, Opus)
These are always transcoded regardless of transfer mode. The lossy-to-lossy warning is orthogonal to transfer mode.

### Source artwork is smaller than device max resolution
For future embedded/sidecar devices: do not upscale. Use the source artwork as-is or copy it directly. Only downscale when source exceeds device max.
