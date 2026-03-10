---
title: Resetting a Device
description: Reset the iPod database to fix corruption or start fresh with podkit.
sidebar:
  order: 7
---

The `podkit device reset` command recreates the iPod database from scratch. This is more thorough than clearing content and is the right choice when the database itself is corrupted.

## Basic Usage

```bash
# Reset the default device
podkit device reset

# Reset a specific device
podkit device reset classic
```

## What Reset Does

A reset performs the following:

1. Erases all track entries from the iPod database
2. Removes media files from the iPod filesystem
3. Recreates the iTunesDB with a fresh, empty database

After a reset, the iPod is in a clean state ready for a fresh sync.

## When to Use Reset

- **Database corruption:** The iPod shows incorrect track counts, crashes during playback, or podkit reports database errors
- **Fresh start:** You want to completely start over with a clean sync
- **After firmware changes:** If you updated or restored the iPod firmware

## Reset vs Clear

| | `device reset` | `device clear` |
|---|---|---|
| **Removes tracks** | Yes | Yes |
| **Recreates database** | Yes | No |
| **Fixes corruption** | Yes | No |
| **Use when** | Database is broken or you want a clean slate | Just removing content |

Use [clear](./clearing/) if you only need to remove tracks. Use reset if the database itself is the problem.

## Initializing Blank or Corrupted iPods

For iPods that have no database at all (blank filesystem or severely corrupted), use `podkit device init`:

```bash
podkit device init classic
```

This creates the required iPod directory structure and a fresh iTunesDB. Use this when the iPod has been manually formatted or has never been initialized.

## See Also

- [Clearing Content](./clearing/) for removing tracks without resetting the database
- [Formatting a Device](./formatting/) for full filesystem formatting
- [Managing Devices](./) for device configuration
