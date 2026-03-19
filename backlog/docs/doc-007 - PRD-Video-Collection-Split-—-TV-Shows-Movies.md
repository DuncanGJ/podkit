---
id: doc-007
title: 'PRD: Video Collection Split — TV Shows & Movies'
type: other
created_date: '2026-03-19 13:35'
---
## Problem Statement

podkit currently treats all video content as a single `video` collection type. The CLI commands (`collection video`, `device video`) reuse music-centric display concepts (albums, artists) that don't map well to video content. TV shows display as "Unknown Album" with series names shoehorned into the "Artist" field. Movies and TV episodes are mixed in the same listing with no way to browse them differently.

The iPod itself already distinguishes between movies and TV shows at the database level (`MediaType.Movie` vs `MediaType.TVShow`, with dedicated fields like `tvShow`, `seasonNumber`, `episodeNumber`, `movieFlag`). The core library's `CollectionVideo` type already has a `contentType: 'movie' | 'tvshow'` discriminator. But the config, CLI, and display layers don't surface this distinction — they flatten everything into "video."

Users who have TV show collections want to browse by show → season → episode. Users with movie collections want a simple list sorted by title or year. The current one-size-fits-all approach serves neither well.

## Solution

Split the `video` collection type into two first-class collection types: **tv** and **movies**. This is a config-level change — users declare `[tv.*]` and `[movies.*]` sections instead of `[video.*]`. The CLI gains purpose-built subcommands for each type with display and drill-down tailored to the content's natural hierarchy.

**Config example:**

```toml
version = 1

[tv.anime]
path = "/media/anime"

[tv.shows]
path = "/media/tv-shows"

[movies.default]
path = "/media/movies"

[defaults]
tv = "anime"
movies = "default"
```

Two collections can point at the same directory — the scanner filters by detected content type (tv or movies) and warns about content that doesn't match. There is no `[video.*]` catch-all; users declare what they have, and podkit helps them get it right.

**CLI browsing:**

```bash
# TV shows
podkit collection tv                          # Stats: show count, season count, episode count
podkit collection tv "Digimon"                # Drill into matching show(s) — fuzzy match
podkit collection tv "Digimon" --season 1     # Episodes in season 1
podkit collection tv --episodes               # Flat episode list

# Movies
podkit collection movies                      # Stats: movie count, format breakdown
podkit collection movies --list               # Movie list (title, year, duration, format)
podkit collection movies --list --sort year   # Sorted by year

# Sync
podkit sync -t tv                             # Sync TV collections only
podkit sync -t movies                         # Sync movie collections only
podkit sync -t video                          # Convenience alias: sync both tv + movies
```

Device-side commands (`podkit device tv`, `podkit device movies`) mirror the collection commands exactly — two repositories, same lens.

**Dependency: This PRD requires the Config Migration Wizard PRD (doc-006) to be completed first.** The `[video.*]` → `[tv.*]` + `[movies.*]` change is a breaking config change that needs the migration infrastructure to handle gracefully. The first migration (version 0→1) will be this video split.

## User Stories

1. As a podkit user with TV shows, I want to see a list of my shows with season and episode counts, so that I can quickly understand what's in my collection.
2. As a podkit user, I want to drill into a specific show by name and see its seasons and episodes, so that I can verify my collection is complete.
3. As a podkit user, I want fuzzy matching when I type a show name, so that I don't have to type the exact full title.
4. As a podkit user with movies, I want to see a flat movie list sorted by title, so that I can browse my collection naturally.
5. As a podkit user, I want to sort my movie list by year, so that I can see what I have chronologically.
6. As a podkit user, I want to configure separate quality presets for TV and movies, so that I can save space on TV episodes while keeping movies at high quality.
7. As a podkit user, I want per-device quality overrides for TV and movies separately, so that I can have different quality on different iPods.
8. As a podkit user, I want to sync only TV shows or only movies with `-t tv` or `-t movies`, so that I can control what gets synced.
9. As a podkit user, I want `podkit sync -t video` to sync both TV and movies as a convenience, so that I don't have to type both.
10. As a podkit user, I want to point two collection sections (`[tv.default]` and `[movies.default]`) at the same directory, so that podkit auto-detects and filters by content type.
11. As a podkit user, I want to see a warning when my TV collection directory contains movies that won't be synced (and vice versa), so that I know to configure an additional collection or fix my file naming.
12. As a podkit user, I want `podkit device tv` to show me what's on my iPod with the same display as `podkit collection tv`, so that I can compare source and device easily.
13. As a podkit user, I want tab completion for show names when drilling down, so that I can quickly navigate to the show I want.
14. As a podkit user, I want tab completion for TV and movies collection names, so that the `-c` flag is easy to use.
15. As a podkit user, I want purpose-built columns for TV episodes (show, season, episode, title, duration, format) instead of repurposed music columns (artist, album), so that the output makes sense for video content.
16. As a podkit user, I want purpose-built columns for movies (title, year, duration, resolution, format) instead of repurposed music columns, so that the output is useful.
17. As a podkit user, I want `podkit collection tv` stats to show show count, season count, and episode count, so that the summary is meaningful for TV content.
18. As a podkit user, I want `podkit collection movies` stats to show movie count and format breakdown, so that the summary is meaningful for movie content.
19. As a podkit user, I want the `--fields` flag to still work as a power-user escape hatch with video-appropriate field names (show, season, episode, resolution, codec, etc.), so that I can customize output when needed.
20. As a podkit user, I want `podkit collection list` to show TV and movie collections separately from music, so that the collection overview is clear.
21. As a podkit user, I want `podkit collection add` to support adding TV and movie collections, so that I can configure new collections interactively.
22. As a podkit user running `podkit sync` with no flags, I want it to sync all default collections (music, TV, and movies), so that the default behavior covers everything.
23. As a podkit user, I want the `--filter` flag on sync to work with TV and movie collections, so that I can selectively sync specific content.
24. As a podkit user, I want `--format json` and `--format csv` to work with TV and movie output using the new field names, so that I can pipe output to other tools.
25. As a podkit user, I want `podkit device tv "Digimon"` to drill into a show on my iPod the same way `podkit collection tv "Digimon"` does for my source, so that the browsing experience is symmetric.
26. As a podkit user, I want the quality cascade to be: `quality` → `videoQuality` → `tvQuality`/`movieQuality`, so that I can set broad defaults and override specifically.
27. As a podkit user with per-device config, I want the same quality cascade at the device level, so that device-specific overrides work with the same granularity.
28. As a Docker user, I want environment variables for TV and movie collection paths (e.g., `PODKIT_TV_PATH`, `PODKIT_MOVIES_PATH`), so that I can configure collections without a config file.

## Implementation Decisions

### Config Structure
- `[video.*]` sections are replaced by `[tv.*]` and `[movies.*]` top-level sections.
- Both use the same config interface (path is the only required field for directory collections).
- `defaults.video` is replaced by `defaults.tv` and `defaults.movies`.
- Quality cascade adds `tvQuality` and `movieQuality` fields to both global config and per-device config. Resolution order: `quality` → `videoQuality` → `tvQuality`/`movieQuality`. The `videoQuality` layer remains because it's useful as a device-level "all video on this device" shorthand.
- Two collections can share the same `path`. The scanner runs once per collection but filters results by the collection's declared content type.

### Content Type System
- `ContentType` expands from `'music' | 'video'` to `'music' | 'tv' | 'movies'`.
- `CONTENT_TYPES` constant updated accordingly.
- `'video'` becomes a CLI-only alias that expands to `['tv', 'movies']` — it is not a valid config-level content type.
- The `isVideoMediaType()` function in the core remains unchanged — it checks for Movie/TVShow/MusicVideo media type flags regardless of the content type label.

### Directory Adapter Filtering
- `VideoDirectoryAdapter` gains a content type filter parameter: `'tv'`, `'movies'`, or `undefined` (scan everything, for migration wizard use).
- When filtering, the adapter still scans all files but partitions results by detected `contentType`. Files that don't match the filter are collected and reported as warnings.
- Warning format: "Found N movies in this directory that won't be synced. Configure a movies collection pointing at this path to include them."
- Auto-detection logic is unchanged — filtering happens after detection, not instead of it.

### Collection Resolution
- New `resolveTvCollection()` and `resolveMoviesCollection()` functions alongside the existing `resolveMusicCollection()`.
- `resolveCollectionByType()` updated to dispatch to the correct resolver based on type.
- `findCollectionByName()` searches all three namespaces (music, tv, movies).
- `getAllCollections()` returns all three types, sorted by type.

### CLI Collection Commands
- New `collection tv` subcommand:
  - Default mode: stats (show count, season count, episode count, file type breakdown)
  - Positional argument: show name (fuzzy substring match, case-insensitive). Returns all matching shows with their season/episode breakdown.
  - `--season N` flag: filter to a specific season when drilling into a show.
  - `--episodes` flag: flat episode list with purpose-built columns (show, season, episode, title, duration, format).
  - `--format` and `--fields` flags carry over.
- New `collection movies` subcommand:
  - Default mode: stats (movie count, file type breakdown, resolution breakdown)
  - `--list` flag: flat movie list with purpose-built columns (title, year, duration, resolution, format).
  - `--sort title|year` flag (default: title).
  - `--format` and `--fields` flags carry over.
- Existing `collection video` subcommand is removed.

### CLI Device Commands
- New `device tv` and `device movies` subcommands that mirror the collection commands exactly.
- `device tv` filters iPod tracks by `MediaType.TVShow`.
- `device movies` filters iPod tracks by `MediaType.Movie`.
- Existing `device video` subcommand is removed.

### Display Infrastructure
- New display types: `TVShowSummary` (show name, season count, episode count), `TVEpisodeDisplay` (show, season, episode, title, duration, format), `MovieDisplay` (title, year, duration, resolution, format).
- New stats types: `TVStats` (shows, seasons, episodes, file types), `MovieStats` (movies, file types, resolutions).
- These are independent of `DisplayTrack` — video display does not shoehorn data into music-shaped types.
- Table/JSON/CSV formatters extended to handle the new display types.

### Sync Command
- `-t`/`--type` choices expand to: `music`, `tv`, `movies`, `video` (alias).
- When `-t video` is passed, it expands to `['tv', 'movies']` internally.
- `resolveCollections()` updated to handle tv and movies as separate types.
- Default behavior (no `-t` flag): sync all types with defaults (music + tv + movies).
- Quality resolution updated to use the new cascade.

### Tab Completion
- New `__complete tv-collections` and `__complete movies-collections` hidden commands.
- `__complete collections` updated to include all three types.
- New `__complete tv-shows` command that scans the default TV collection and returns show names. Used for positional argument completion on `collection tv` and `device tv`.
- Completion generators (zsh/bash) updated to wire show name completion to the positional argument.

### Environment Variables
- New env vars: `PODKIT_TV_PATH`, `PODKIT_TV_<NAME>_PATH`, `PODKIT_MOVIES_PATH`, `PODKIT_MOVIES_<NAME>_PATH`.
- `PODKIT_VIDEO_PATH` and `PODKIT_VIDEO_<NAME>_PATH` are removed (breaking). The version detection system communicates this.
- New quality env vars: `PODKIT_TV_QUALITY`, `PODKIT_MOVIE_QUALITY`.

### Config Migration (version 0→1)
- This is the first migration in the migration wizard system (from the Config Migration Wizard PRD).
- Detects `[video.*]` sections in the config file.
- For each video collection: scans the directory using the adapter (no filter), reports what content types were found, asks the user how to configure it (tv, movies, or both).
- Rewrites `[video.*]` sections as `[tv.*]` and/or `[movies.*]` based on user decisions.
- Updates `defaults.video` → `defaults.tv` / `defaults.movies`.
- Updates device-level `videoQuality` references if applicable.

## Testing Decisions

Good tests for this feature verify that the config parses correctly, collections resolve to the right type, the adapter filters content accurately, and the display output is well-formed. Tests should exercise the public interfaces, not internal helpers.

### Modules to test:
- **Config parsing**: New `[tv.*]` and `[movies.*]` sections parse correctly. Quality cascade resolves in the right order. Invalid configs produce clear errors.
- **Collection resolver**: TV and movies collections resolve by name and default. `findCollectionByName` searches all namespaces. Type-filtered resolution works correctly.
- **Directory adapter filtering**: Given a directory with mixed content, a `tv` filter returns only TV shows and reports movie warnings. A `movies` filter returns only movies and reports TV warnings. No filter returns everything.
- **Content type detection**: Existing tests remain valid. New tests verify that filtering partitions correctly based on detected content type.
- **Quality cascade**: Unit tests for quality resolution: global → videoQuality → tvQuality/movieQuality, with per-device overrides at each level.
- **Sync type expansion**: `video` alias expands to `['tv', 'movies']`. Default (no type) includes all three types.

### Prior art:
- Existing config parsing tests for `[video.*]` sections — adapted for `[tv.*]` and `[movies.*]`.
- Existing collection resolver tests — extended for new types.
- Existing `VideoDirectoryAdapter` integration tests — extended with filter parameter.
- Existing display-utils tests for album/artist aggregation — new display types follow the same testing pattern.

## Out of Scope

- **Music video support**: `MusicVideo` media type (0x0020) is not addressed in this PRD. It remains grouped with video for now.
- **Subsonic video sources**: Video collections remain directory-only. Adding Subsonic or other source types for TV/movies is a separate concern.
- **Interactive TUI browser**: This PRD covers CLI flag-based browsing, not an interactive terminal UI with navigation.
- **Metadata editing**: Users cannot modify detected content types or metadata through the CLI. They fix their file naming/structure and re-scan.
- **Playlist/smart collection support**: No concept of video playlists or filtered views beyond the show/season drill-down.
- **The migration wizard infrastructure itself**: That is covered by the Config Migration Wizard PRD (doc-006). This PRD only defines the specific version 0→1 migration step.

## Further Notes

- The `collection video` and `device video` subcommands should produce a clear error message pointing users to the new `collection tv` / `collection movies` commands, rather than silently disappearing. This helps users who have muscle memory from the old command structure.
- The `--albums` and `--artists` flags on the old `collection video` command are intentionally not carried over. The new subcommands have purpose-built flags that match the content type's natural hierarchy.
- Show name fuzzy matching should be case-insensitive substring matching. If multiple shows match, all are displayed. If no shows match, a helpful message is shown with available show names.
- The resolution breakdown in movie stats (e.g., "1080p: 5, 720p: 3, 480p: 2") is useful because video resolution directly affects file size and transcoding decisions — it helps users understand their collection's transcode burden.
- Consider whether `podkit collection tv --episodes --format json` should include all metadata fields by default (not just display columns), since JSON output is typically consumed by scripts that want complete data.
