# Product Requirements Document: podkit

**Version:** 1.1
**Last Updated:** 2026-02-22
**Status:** Active

## Executive Summary

podkit is a command-line tool and TypeScript library for synchronizing music collections to iPod devices. It provides scriptable, automated sync with high-quality transcoding, proper metadata handling, and album artwork support.

## Problem Statement

Users managing iPod devices (particularly classic/modded iPods) face these challenges:

1. **No scriptable sync** — Existing tools (gtkpod) require GUI interaction
2. **Poor duplicate detection** — Transcoded files aren't matched to originals
3. **Metadata loss** — Transcoded files on iPod often lack embedded tags
4. **Quality control** — Limited control over transcoding quality settings
5. **No automation** — Cannot trigger sync on device connection

### Why podkit?

- Classic iPods remain popular as dedicated music players
- Modded iPods (SD card, large storage) need reliable sync tools
- Modern TypeScript tooling makes native bindings accessible
- libgpod is stable and well-documented

## Goals

### Primary Goals

1. **Reliable sync** — Correctly identify and transfer new music to iPod
2. **High-quality audio** — Produce excellent-sounding AAC files
3. **Metadata preservation** — Maintain all tags and artwork through sync
4. **Scriptability** — Full CLI support for automation
5. **Extensibility** — Support multiple collection sources via adapters

### Non-Goals (v1.0)

- Fetching artwork from external services
- Playlist management
- Play count / rating sync back to collection
- Video or podcast sync
- iOS device support
- GUI interface

## User Stories

### Primary User: Music Enthusiast with Modded iPod

> As a user with a large FLAC collection and a modded iPod, I want to sync new music automatically, so that my portable library stays current without manual intervention.

**Acceptance Criteria:**
- CLI command syncs all new tracks
- Duplicate tracks detected and skipped
- FLAC files transcoded to high-quality AAC
- Album artwork transferred
- Process completes without GUI interaction

### Secondary User: Audiophile

> As an audiophile, I want control over transcoding quality settings, so that I can balance file size against audio quality.

**Acceptance Criteria:**
- Quality presets available (high/medium/low)
- Default settings produce transparent audio quality
- Documentation explains quality tradeoffs

### Developer User

> As a developer, I want to use podkit as a library, so that I can build custom sync workflows.

**Acceptance Criteria:**
- Core functionality exposed as importable modules
- TypeScript types for all public APIs
- Documented programmatic usage

## Technical Constraints

### Must Use

- **libgpod** — De facto standard for iPod database management
- **FFmpeg** — Audio transcoding
- **TypeScript** — Type safety and developer experience
- **Bun** — Development runtime (Node.js compatible for distribution)

### Platform Dependencies

| Dependency | Debian/Ubuntu | macOS (Homebrew) |
|------------|---------------|------------------|
| libgpod | `libgpod-dev` | `libgpod` |
| FFmpeg | `ffmpeg` | `ffmpeg` |
| GLib | `libglib2.0-dev` | (with libgpod) |

## Milestones

Detailed milestone planning and task tracking is maintained in the project backlog.

| Milestone | Version | Summary |
|-----------|---------|---------|
| M0: Project Bootstrap | — | Dev environment, planning, infrastructure |
| M1: Foundation | v0.1.0 | libgpod bindings, basic CLI |
| M2: Core Sync | v0.2.0 | Collection adapter, diff engine, transcoding |
| M3: Production Ready | v1.0.0 | Artwork, error handling, documentation |
| M4: Extended Sources | v1.1.0 | Additional adapters, filtering |

**Note:** Use `task_list` to view current tasks, or see `backlog/tasks/` for details.

## Success Metrics

| Metric | Target |
|--------|--------|
| Successful sync rate | > 99% |
| Audio quality issues | < 1% of syncs |
| Time to sync 100 tracks | < 10 minutes |
| CLI command success rate | > 99% |

## Related Documents

- [Architecture](ARCHITECTURE.md) — Component design and interfaces
- [libgpod Research](LIBGPOD.md) — libgpod API and binding approaches
- [Transcoding](TRANSCODING.md) — FFmpeg AAC encoding
- [Collection Sources](COLLECTION-SOURCES.md) — Adapter design
- [iPod Internals](IPOD-INTERNALS.md) — iTunesDB format and device quirks
- [ADRs](adr/README.md) — Architecture decision records
