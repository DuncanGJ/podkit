---
title: Quick Start
description: Get syncing music to your iPod in 5 minutes with podkit.
sidebar:
  order: 2
---

Get your music syncing to your iPod in 5 minutes.

## Prerequisites

- podkit installed (see [Installation](/getting-started/installation))
- A supported iPod connected to your computer
- Music files on your computer

## 1. Initialize Configuration

Create a default configuration file:

```bash
podkit init
```

This creates `~/.config/podkit/config.toml` with a template configuration.

## 2. Add Your Music Collection

Use `podkit collection add` to register your music directory:

```bash
podkit collection add music main /path/to/your/music
```

Replace `/path/to/your/music` with the actual path to your music library. This writes the collection to your config file and sets it as the default since it is the first music collection.

## 3. Register Your iPod

1. Connect your iPod to your computer
2. Wait for it to mount (appears in Finder/Files)
3. Register it with podkit:

```bash
podkit device add myipod
```

This auto-detects the connected iPod and saves its identity to your config.

4. Set it as the default device (the command will prompt you).

## 4. Preview Changes

Before syncing, see what podkit will do:

```bash
podkit sync --dry-run
```

This shows how many tracks will be added, what needs transcoding, and estimated size.

## 5. Sync Your Music

When you're happy with the plan:

```bash
podkit sync
```

podkit will scan your collection, transcode files if needed, and copy everything to your iPod.

## 6. Eject Safely

After syncing:

```bash
podkit eject
```

Or use `--eject` to auto-eject after sync:

```bash
podkit sync --eject
```

## Common Commands

```bash
# Check device status
podkit device info

# List music on iPod
podkit device music

# Sync with verbose output
podkit sync -v

# Remove tracks not in source
podkit sync --delete

# Use lower quality (smaller files)
podkit sync --quality medium
```

## Next Steps

- [First Sync](/getting-started/first-sync) - Detailed walkthrough with troubleshooting
- [Configuration](/user-guide/configuration) - Full configuration options
- [CLI Reference](/reference/cli-commands) - All available commands
