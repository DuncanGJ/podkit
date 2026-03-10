---
id: TASK-080
title: 'Improve list commands with stats, albums, and artists views'
status: To Do
assignee: []
created_date: '2026-03-09 21:54'
updated_date: '2026-03-10 11:16'
labels:
  - cli
  - ux
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The `device music` and `device video` commands currently list every track, which is too long to be useful. Users need higher-level views and the ability to browse by album or artist. Collection commands need the same capability.

## Current Behavior
- `podkit device music [name]` - lists every track (overwhelming)
- `podkit device video [name]` - lists every track
- `podkit collection list` - lists configured collections only, no way to browse collection contents

## Desired Behavior

### Default Output (Summary Stats)
When no flags provided, show aggregate statistics:
- Track count
- Album count  
- Artist count
- File type breakdown (e.g., "FLAC: 500, MP3: 200, AAC: 50")

### Listing Modes
- `--tracks` - List all tracks (current behavior)
- `--albums` - List albums with track counts
- `--artists` - List artists with album/track counts

### Consistent UX Across Commands
Same flags and output format for:
- `podkit device music [name]`
- `podkit device video [name]`
- `podkit collection music [name]` (NEW)
- `podkit collection video [name]` (NEW)

## iPod Track Metadata Fields

The `--json` output for tracks should include ALL metadata fields the iPod can store:

### Core Metadata
| Field | Type | Description |
|-------|------|-------------|
| title | string | Track title |
| artist | string | Artist name |
| album | string | Album name |
| albumArtist | string? | Album artist (for compilations) |
| genre | string? | Genre |
| composer | string? | Composer |
| comment | string? | Comment field |
| grouping | string? | Grouping (for organizing tracks) |

### Track/Disc Info
| Field | Type | Description |
|-------|------|-------------|
| trackNumber | number? | Track number on disc |
| totalTracks | number? | Total tracks on disc |
| discNumber | number? | Disc number in set |
| totalDiscs | number? | Total discs in set |
| year | number? | Release year |
| bpm | number? | Beats per minute |
| compilation | boolean | Part of compilation album |

### Technical Info
| Field | Type | Description |
|-------|------|-------------|
| duration | number | Duration in milliseconds |
| bitrate | number | Bitrate in kbps |
| sampleRate | number | Sample rate in Hz |
| size | number | File size in bytes |
| filetype | string? | File type (e.g., "MPEG audio file") |
| mediaType | number | Media type flags |
| filePath | string | Path on iPod |

### Timestamps (device only)
| Field | Type | Description |
|-------|------|-------------|
| timeAdded | number | Unix timestamp when added |
| timeModified | number | Unix timestamp when modified |
| timePlayed | number | Unix timestamp last played |

### Play Statistics (device only)
| Field | Type | Description |
|-------|------|-------------|
| playCount | number | Times played |
| skipCount | number | Times skipped |
| rating | number | Rating (0-100, where 20=1 star) |

### Flags (device only)
| Field | Type | Description |
|-------|------|-------------|
| hasArtwork | boolean | Has artwork |
| hasFile | boolean | Audio file copied |

### Video-Specific
| Field | Type | Description |
|-------|------|-------------|
| tvShow | string? | TV show name |
| tvEpisode | string? | Episode title |
| sortTvShow | string? | TV show sort name |
| seasonNumber | number? | Season (1-99) |
| episodeNumber | number? | Episode (1-999) |
| movieFlag | boolean? | Is a movie |

## Example Output

```
$ podkit device music
Music on TERAPOD:

  Tracks:  1,247
  Albums:  98
  Artists: 45

  File Types:
    FLAC   892
    MP3    280
    AAC     75

$ podkit device music --albums
Albums on TERAPOD:

  ALBUM                          ARTIST              TRACKS
  Abbey Road                     The Beatles         17
  Dark Side of the Moon          Pink Floyd          10
  ...

$ podkit device music --artists  
Artists on TERAPOD:

  ARTIST              ALBUMS  TRACKS
  The Beatles         12      187
  Pink Floyd          8       94
  ...
```

## Files to Modify
- `packages/podkit-cli/src/commands/device.ts` - Update music/video subcommands
- `packages/podkit-cli/src/commands/collection.ts` - Add music/video subcommands
- `packages/podkit-cli/src/commands/display-utils.ts` - Add aggregation/stats formatting
- `packages/podkit-core/src/adapters/interface.ts` - May need aggregation helpers
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Default output shows summary stats: track/album/artist counts and file type breakdown
- [ ] #2 --tracks flag lists all tracks (preserves current behavior)
- [ ] #3 --albums flag lists albums with track counts
- [ ] #4 --artists flag lists artists with album/track counts
- [ ] #5 podkit device music [name] supports all modes
- [ ] #6 podkit device video [name] supports all modes
- [ ] #7 podkit collection music [name] command exists with same modes (NEW)
- [ ] #8 podkit collection video [name] command exists with same modes (NEW)
- [ ] #9 Consistent output format across device and collection commands
- [ ] #10 Works with --json flag for programmatic access
- [ ] #11 --json output includes ALL metadata fields listed in the iPod Track Metadata Fields table
<!-- AC:END -->
