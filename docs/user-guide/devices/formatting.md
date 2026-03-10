---
title: Formatting a Device
description: Format iPod devices with podkit, including current limitations and workarounds.
sidebar:
  order: 6
---

:::caution
Device formatting is **not yet implemented** in podkit. This page describes what the feature will do and provides current workarounds.
:::

## What Formatting Would Do

A full format would erase the iPod filesystem entirely and recreate it from scratch, including:

- Repartitioning the storage
- Creating a fresh FAT32 or HFS+ filesystem
- Setting up the iPod directory structure
- Initializing a new iTunesDB

This goes beyond [resetting](./resetting/), which only recreates the database while leaving the filesystem intact.

## Current Workarounds

Until podkit supports formatting directly, use one of these approaches:

### Using iTunes or Finder (macOS)

1. Connect the iPod
2. Open Finder (macOS Catalina+) or iTunes (older macOS)
3. Select the iPod and click **Restore**
4. Wait for the restore to complete
5. Register the device with podkit: `podkit device add`

### Manual Formatting

For advanced users or iFlash-modified iPods:

1. Use Disk Utility (macOS) or `mkfs` (Linux) to format the iPod partition as FAT32
2. Initialize the iPod structure: `podkit device init`
3. Register if not already configured: `podkit device add`

## When Formatting Is Needed vs Reset

| Situation | Solution |
|-----------|----------|
| Corrupted database | [`podkit device reset`](./resetting/) |
| Bad tracks, want a fresh sync | [`podkit device clear`](./clearing/) |
| Filesystem errors or bad sectors | Format (use workaround above) |
| Changing filesystem type (HFS+ to FAT32) | Format (use workaround above) |
| iFlash adapter swap or storage upgrade | Format (use workaround above) |

In most cases, `podkit device reset` is sufficient. Full formatting is only necessary for filesystem-level issues.

## See Also

- [Resetting a Device](./resetting/) for recreating just the database
- [Clearing Content](./clearing/) for removing tracks
- [Managing Devices](./) for device configuration
- [macOS Mounting Troubleshooting](/troubleshooting/macos-mounting/) for mount issues after formatting
