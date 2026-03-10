# ADR-008: Multi-Collection and Multi-Device Configuration

## Status

**Proposed** (2026-03-08)

## Context

The current podkit configuration model assumes a single music source and single iPod device. Real-world users often have:

- **Multiple music collections** (main library, DJ sets, podcasts, work music)
- **Multiple video collections** (movies, TV shows)
- **Multiple iPods** (car iPod, gym iPod, archive iPod with different storage/quality needs)

Additionally, the current CLI has separate `sync` and `video-sync` commands, creating an inconsistent user experience.

### Current Configuration

```toml
source = "/path/to/music"
device = "/media/ipod"
quality = "high"
artwork = true
videoSource = "/path/to/videos"

[transforms.ftintitle]
enabled = true

[ipod]
volumeUuid = "ABC-123"
volumeName = "TERAPOD"
```

### Problems

1. **Single source/device** — No way to manage multiple collections or iPods
2. **Flat structure** — Quality and transforms are global, not device-specific
3. **Mixed media types** — Music and video sources share the same namespace
4. **Separate commands** — `sync` vs `video-sync` creates inconsistency

## Decision Drivers

- **Clarity** — Clear separation between what to sync (collections) and how to sync (device settings)
- **Scalability** — Support users with complex setups without complicating simple use cases
- **Consistency** — Unified CLI experience for music and video
- **Backwards compatibility** — Existing configs should continue to work (migration path)

## Options Considered

### Option A: Unified `[collections.*]` with `type` property

```toml
[collections.main]
type = "music"
path = "/path/to/music"

[collections.movies]
type = "video"
path = "/path/to/movies"
```

**Pros:** Single namespace, simple mental model
**Cons:** Mixed media types in one namespace, type property feels redundant

### Option B: Separate `[music.*]` and `[video.*]` namespaces (Recommended)

```toml
[music.main]
path = "/path/to/music"

[video.movies]
path = "/path/to/movies"
```

**Pros:** Clear separation, contextual CLI behavior, type-specific defaults
**Cons:** Two namespaces to manage

### Option C: Source + Device profiles

```toml
[profiles.gym]
collection = "dj"
device = "nano"
quality = "low"
```

**Pros:** Pre-configured pairings
**Cons:** Over-engineering, adds another concept

## Decision

**Option B: Separate `[music.*]` and `[video.*]` namespaces**

### Config Schema

```toml
# ~/.config/podkit/config.toml

# Music collections
[music.main]
path = "/Volumes/Media/music/library"

[music.dj]
path = "/Volumes/Media/dj-sets"

[music.work]
type = "subsonic"
url = "https://music.work.com"
username = "james"
# Password via env: PODKIT_MUSIC_WORK_PASSWORD

# Video collections
[video.movies]
path = "/Volumes/Media/movies"

[video.shows]
path = "/Volumes/Media/tv-shows"

# Devices (sync targets with device-specific settings)
[devices.terapod]
volumeUuid = "ABC-123"
volumeName = "TERAPOD"
quality = "high"
videoQuality = "high"
artwork = true

[devices.terapod.transforms.ftintitle]
enabled = true
format = "feat. {}"

[devices.nano]
volumeUuid = "DEF-456"
volumeName = "NANO"
quality = "low"
artwork = false

[devices.nano.transforms.ftintitle]
enabled = false

# Defaults when CLI flags are omitted
[defaults]
music = "main"
video = "movies"
device = "terapod"
```

### Key Design Decisions

1. **Separate music/video namespaces** — `[music.*]` and `[video.*]` at the top level, not a `type` property
2. **Quality and transforms scoped to devices** — Collections define *what* to sync, devices define *how*
3. **Device settings** — `quality` (music AAC), `videoQuality` (video H.264), `artwork`, `transforms`
4. **Collection types** — Default is `directory`, explicit `type = "subsonic"` for remote sources
5. **Named defaults** — `[defaults]` section specifies which collection/device to use when flags omitted

### CLI Command Structure

#### Unified Sync Command

```bash
podkit sync                          # sync all defaults (music + video)
podkit sync music                    # sync default music collection only
podkit sync video                    # sync default video collection only
podkit sync -c <name>                # sync matching collections (searches both namespaces)
podkit sync -c <name> music          # sync specific music collection
podkit sync -c <name> video          # sync specific video collection
podkit sync --device <name|path>     # sync to specific device (by name or path)
podkit sync --dry-run                # preview changes
```

The `-c` flag searches both `[music.*]` and `[video.*]` namespaces and syncs all matches. If `music.foo` and `video.foo` both exist, `podkit sync -c foo` syncs both.

The `--device` flag accepts either a named device from config (e.g., `--device terapod`) or a path (e.g., `--device /Volumes/IPOD`). Values containing `/` or starting with `.` are treated as paths.

#### Device Management

```bash
podkit device                        # list configured devices
podkit device add <name>             # detect connected iPod, save UUID to config
podkit device remove <name>          # remove device from config
podkit device show <name>            # show device configuration details
```

#### Collection Management

```bash
podkit collection                    # list all collections (music + video)
podkit collection music              # list music collections only
podkit collection video              # list video collections only
podkit collection add music <name> <path>
podkit collection add video <name> <path>
podkit collection add music <name> --subsonic  # interactive subsonic setup
podkit collection remove <name>      # remove (searches both namespaces)
podkit collection show <name>        # show collection details
```

#### Device-Scoped Commands

All commands that interact with a device accept the `--device <name|path>` flag:

```bash
podkit device info [name]            # or: podkit device info --device <name|path>
podkit device music [name]           # list music on device
podkit device video [name]           # list video on device
podkit device clear [name]           # clear all content
podkit device reset [name]           # reset database
podkit mount [name]                  # mount device (use --disk for explicit identifier)
podkit eject [name]                  # eject device
```

Note: The `--device` flag accepts either a named device from config or a mount path. The `mount` command uses `--disk` for explicit disk identifiers (e.g., `/dev/disk4s2`) to avoid confusion with the global `--device` flag.

### Backwards Compatibility

Existing configs with top-level `source`, `device`, `quality`, etc. will be migrated:

```toml
# Old format (still supported, treated as defaults)
source = "/path/to/music"
device = "/media/ipod"
quality = "high"
```

Interpreted as:

```toml
[music.default]
path = "/path/to/music"

[devices.default]
# Auto-detected from mount path
quality = "high"

[defaults]
music = "default"
device = "default"
```

## Consequences

### Positive

- Clear separation of concerns (collections vs devices)
- Scalable to complex multi-library setups
- Unified CLI for music and video
- Device-specific quality/transforms enables per-iPod optimization
- Named collections/devices are self-documenting

### Negative

- More complex config file for advanced setups
- Migration needed for existing configs
- Learning curve for multi-device flags

### Neutral

- Subsonic credentials require environment variables or secure storage (not in config file)
- Config validation becomes more complex

## Implementation Notes

### Phase 1: Config Schema

1. Define TypeScript types for new config structure
2. Update config loader to parse new schema
3. Implement backwards compatibility layer for old configs
4. Add config validation with helpful error messages

### Phase 2: CLI Commands

1. ✅ Unify `sync` and `video-sync` into single command with `music`/`video` type argument
2. ✅ Add `-c` flag for collection selection, `--device` for device selection
3. ✅ Implement `device` subcommand (add, remove, info, list, music, video, clear, reset, mount, eject, init)
4. ✅ Implement `collection` subcommand (add, remove, info, list, music, video)
5. ✅ Global `--device` flag accepts both paths and named devices

### Phase 3: Core Integration

1. Update sync engine to accept collection and device references
2. Apply device-specific quality and transform settings
3. Ensure device auto-detection works with named devices

## Related Decisions

- [ADR-004](ADR-004-collection-sources.md): Collection Source Abstraction (adapter pattern)
- [ADR-007](ADR-007-subsonic-collection-source.md): Subsonic Collection Source

## References

- TASK-062: Design collection and device management for multi-library workflows
- TASK-071: Design collection metadata caching for faster rescans
