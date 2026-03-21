---
title: Artwork Repair
description: How to diagnose and repair corrupted album artwork on your iPod.
sidebar:
  order: 3
---

If your iPod is showing wrong artwork, artwork from a different album, or glitched images, the artwork database may be corrupted. podkit can detect and repair this automatically.

## Symptoms

- Tracks display artwork from a different album
- Artwork appears corrupted or glitched
- Artwork changes after rebooting the iPod
- Some tracks show correct artwork while most show wrong artwork

## Diagnosing the Problem

Run `podkit doctor` to check your iPod's health:

```bash
podkit doctor
```

If artwork corruption is detected, you'll see output like:

```
podkit doctor — checking iPod at /Volumes/TERAPOD

  ✗ Artwork Integrity    CORRUPTION DETECTED

    Corrupt:      2,043 / 2,532 entries (81%) reference data beyond ithmb file bounds
    Healthy:      246 entries with valid offsets

    The artwork database is out of sync with the thumbnail files.
    Affected tracks display wrong or missing artwork on the iPod.

    To repair: podkit doctor -d <device> -c <collection> --repair artwork-integrity
```

## Repairing Artwork

The repair command rebuilds all artwork from your source music collection. You must specify the device (`-d`) and collection (`-c`) so podkit knows which source to match tracks against:

```bash
podkit doctor -d myipod -c main --repair artwork-integrity
```

### What the Repair Does

1. **Removes all existing artwork** from every track on the iPod
2. **Matches each track** back to its source file using artist, title, and album metadata
3. **Re-extracts artwork** from the source files and applies it to the iPod
4. **Saves the database** — this writes completely fresh thumbnail files

### What It Doesn't Touch

- Audio files on the iPod are not modified
- Playlists remain unchanged
- Play counts and ratings are preserved
- Track metadata (titles, artists, etc.) is not changed

### Prerequisites

- Your source music collection must be accessible (local directory or Subsonic server)
- A podkit config file with your music collection configured
- The iPod must be mounted and writable

### Preview First

Use `--dry-run` to see what would happen without making changes:

```bash
podkit doctor -d myipod -c main --repair artwork-integrity --dry-run
```

This loads your collection, matches tracks, and reports statistics without modifying the iPod.

## After Repair

Run `podkit doctor` again to verify the repair was successful:

```bash
podkit doctor
```

You should see:

```
podkit doctor — checking iPod at /Volumes/TERAPOD

  ✓ Artwork Integrity    2,532 entries, 2 formats (1028, 1029), all offsets valid

All checks passed.
```

Eject the iPod safely before disconnecting — this ensures all data is flushed to disk:

```bash
podkit eject
```

## Related Diagnostics

`podkit doctor` also checks for [orphaned files](/troubleshooting/common-issues#orphaned-files-after-interrupted-sync) — audio files on the iPod that aren't referenced by the database. Run `podkit doctor` to see all available health checks.

## Why This Happens

See [Artwork Corruption Background](/devices/artwork-corruption) for the technical details on what causes this issue and why the repair works.
