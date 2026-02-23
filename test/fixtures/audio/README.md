# Test Audio Fixtures

Synthetic FLAC audio files for testing podkit's sync pipeline, transcoding, and artwork transfer features.

## File Reference

| Album | File | Title | Duration | Artwork |
|-------|------|-------|----------|---------|
| Synthetic Classics | `goldberg-selections/01-harmony.flac` | Harmony | 20s | Yes |
| Synthetic Classics | `goldberg-selections/02-vibrato.flac` | Vibrato | 20s | Yes |
| Synthetic Classics | `goldberg-selections/03-tremolo.flac` | Tremolo | 20s | Yes |
| Test Tones | `synthetic-tests/01-a440.flac` | A440 Reference | 15s | Yes |
| Test Tones | `synthetic-tests/02-sweep.flac` | Frequency Sweep | 15s | Yes |
| Test Tones | `synthetic-tests/03-dual-tone.flac` | Dual Tone | 15s | **No** |

### Audio Descriptions

| File | Description |
|------|-------------|
| `01-harmony.flac` | C major chord (C4+E4+G4) with fade in/out |
| `02-vibrato.flac` | 220Hz tone with vibrato modulation |
| `03-tremolo.flac` | 440Hz tone with tremolo (amplitude modulation) |
| `01-a440.flac` | Pure 440Hz sine wave (concert pitch A) |
| `02-sweep.flac` | Rising frequency sweep (200Hz → 1kHz) |
| `03-dual-tone.flac` | Two-tone mix (330Hz + 440Hz) |

## Metadata

All files include these tags:

| Tag | Value |
|-----|-------|
| ARTIST | Podkit Test Generator |
| ALBUM | Synthetic Classics / Test Tones |
| TITLE | (track name) |
| TRACKNUMBER | 1-3 |
| DATE | 2026 |
| GENRE | Electronic |

Artwork is a 500x500 JPEG gradient image (different colors per album).

## Reading Metadata

Use `metaflac` (from FLAC tools) or `ffprobe` (from FFmpeg) to inspect files:

```bash
# List all metadata tags
metaflac --list --block-type=VORBIS_COMMENT goldberg-selections/01-harmony.flac

# Show specific tags
metaflac --show-tag=TITLE --show-tag=ALBUM --show-tag=ARTIST goldberg-selections/01-harmony.flac

# Check if artwork is embedded (look for PICTURE block)
metaflac --list --block-type=PICTURE goldberg-selections/01-harmony.flac

# Using ffprobe (shows tags and stream info)
ffprobe -hide_banner goldberg-selections/01-harmony.flac

# Extract embedded artwork to a file
metaflac --export-picture-to=extracted-cover.jpg goldberg-selections/01-harmony.flac
```

Example output:

```
$ metaflac --show-tag=TITLE --show-tag=ALBUM --show-tag=ARTIST goldberg-selections/01-harmony.flac
ARTIST=Podkit Test Generator
ALBUM=Synthetic Classics
TITLE=Harmony
```

## Test Scenarios Covered

- Basic sync with complete metadata
- Album artwork embedded in FLAC files
- Different artwork between albums
- Track without embedded artwork (edge case: `03-dual-tone.flac`)
- Various audio characteristics for transcoding validation

## License

These files are **original synthetic audio** generated specifically for this project using FFmpeg.

**License:** CC0 1.0 Universal (Public Domain Dedication)

You are free to use, modify, and distribute these files for any purpose without attribution.

## Generation

Files were generated using:

```bash
# Example: Generate a chord
ffmpeg -f lavfi -i "sine=frequency=261.63:sample_rate=44100:duration=20" \
  -f lavfi -i "sine=frequency=329.63:sample_rate=44100:duration=20" \
  -f lavfi -i "sine=frequency=392:sample_rate=44100:duration=20" \
  -filter_complex "[0][1][2]amix=inputs=3" -c:a flac output.flac

# Add metadata and artwork
metaflac --set-tag="ARTIST=Podkit Test Generator" \
  --set-tag="ALBUM=Synthetic Classics" \
  --set-tag="TITLE=Harmony" \
  --set-tag="TRACKNUMBER=1" \
  --set-tag="DATE=2026" \
  --set-tag="GENRE=Electronic" \
  --import-picture-from=cover.jpg \
  output.flac
```

## Size

Total: ~4.3 MB (no git-lfs required)
