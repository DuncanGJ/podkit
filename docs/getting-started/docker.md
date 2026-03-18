---
title: Docker
description: Run podkit in Docker to sync music collections to iPod devices from any Linux host.
sidebar:
  order: 4
---

podkit is available as a multi-architecture Docker image for `linux/amd64` and `linux/arm64`, built on Alpine Linux. The image follows [LinuxServer.io](https://www.linuxserver.io/) conventions for user permissions, environment variables, and volume mounts.

## Quick Start

### 1. Create a directory for your config

```bash
mkdir -p podkit/config
```

### 2. Generate a config file

```bash
docker run --rm -v ./podkit/config:/config ghcr.io/jvgomg/podkit:latest init
```

This creates `podkit/config/config.toml` with a commented template.

### 3. Edit the config

Open `podkit/config/config.toml` and set your music collection path. Since you'll be mounting your music directory at `/music` inside the container, use that as the path:

```toml
[music.main]
path = "/music"

[defaults]
music = "main"
```

### 4. Run a dry-run sync

```bash
docker run --rm \
  -v ./podkit/config:/config \
  -v /path/to/music:/music:ro \
  -v /media/ipod:/ipod \
  ghcr.io/jvgomg/podkit:latest sync --dry-run
```

### 5. Sync for real

```bash
docker run --rm \
  -v ./podkit/config:/config \
  -v /path/to/music:/music:ro \
  -v /media/ipod:/ipod \
  ghcr.io/jvgomg/podkit:latest sync
```

## Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  podkit:
    image: ghcr.io/jvgomg/podkit:latest
    container_name: podkit
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    volumes:
      - ./config:/config
      - /path/to/music:/music:ro
      - /media/ipod:/ipod
```

Generate a config and sync:

```bash
docker compose run --rm podkit init       # Generate config
# Edit config/config.toml
docker compose run --rm podkit sync --dry-run  # Preview
docker compose run --rm podkit sync            # Sync
```

## Volume Mounts

| Mount | Required | Mode | Purpose |
|-------|----------|------|---------|
| `/config` | Yes | Read-write | Config file and cache |
| `/music` | Yes* | Read-only | Music collection directory |
| `/ipod` | Yes | Read-write | iPod mount point |

*Not required if using a [Subsonic source](/user-guide/subsonic-source) defined in your config file.

The container automatically passes `--device /ipod` to the sync command, so your iPod mount is always used as the target device.

## Environment Variables

### Docker-specific

| Variable | Default | Description |
|----------|---------|-------------|
| `PUID` | `1000` | User ID for file operations |
| `PGID` | `1000` | Group ID for file operations |
| `TZ` | `Etc/UTC` | Container timezone |

### podkit settings

All [podkit environment variables](/reference/environment-variables) work inside the container. Common overrides:

| Variable | Example | Description |
|----------|---------|-------------|
| `PODKIT_QUALITY` | `medium` | Transcoding quality preset |
| `PODKIT_ARTWORK` | `true` | Include album artwork |
| `PODKIT_CLEAN_ARTISTS` | `true` | Clean up featured artist credits |
| `PODKIT_CHECK_ARTWORK` | `true` | Detect artwork changes between syncs |

Example with quality override:

```yaml
services:
  podkit:
    image: ghcr.io/jvgomg/podkit:latest
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - PODKIT_QUALITY=medium
      - PODKIT_CLEAN_ARTISTS=true
    volumes:
      - ./config:/config
      - /path/to/music:/music:ro
      - /media/ipod:/ipod
```

## Running Commands

The default command is `sync`, but you can run any podkit command:

```bash
# Show device info
docker compose run --rm podkit device info --device /ipod

# List music on iPod
docker compose run --rm podkit device music --device /ipod

# Sync with specific options
docker compose run --rm podkit sync --dry-run --delete

# Open a shell for debugging
docker compose run --rm --entrypoint /bin/bash podkit
```

## iPod Mount Point

The iPod must be mounted on the host system and the mount point passed to the container as a volume. How you mount the iPod depends on your Linux distribution:

```bash
# Example: mount iPod at /media/ipod
sudo mount /dev/sdb2 /media/ipod

# Then run podkit
docker compose run --rm podkit sync
```

### USB Device Passthrough

If you need the container to access USB devices directly (for future daemon mode or mount/eject commands), you can pass through the USB bus:

```yaml
services:
  podkit:
    image: ghcr.io/jvgomg/podkit:latest
    volumes:
      - ./config:/config
      - /path/to/music:/music:ro
      - /media/ipod:/ipod
    devices:
      - /dev/bus/usb:/dev/bus/usb
    privileged: true
```

:::caution
Running with `privileged: true` gives the container full access to the host's devices. Only use this if you need USB passthrough.
:::

## Subsonic Source

To sync from a Subsonic-compatible server (Navidrome, Airsonic, etc.), configure the source in your config file:

```toml
[music.navidrome]
type = "subsonic"
url = "https://navidrome.example.com"
username = "user"
path = "/config/subsonic-cache"

[defaults]
music = "navidrome"
```

Set the password via environment variable:

```yaml
services:
  podkit:
    image: ghcr.io/jvgomg/podkit:latest
    environment:
      - PUID=1000
      - PGID=1000
      - PODKIT_MUSIC_NAVIDROME_PASSWORD=your-password-here
    volumes:
      - ./config:/config
      - /media/ipod:/ipod
```

The Subsonic cache is stored in `/config/subsonic-cache` so it persists between runs.

## Image Tags

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable release |
| `x.y.z` | Specific version (e.g., `0.5.0`) |
| `x.y` | Latest patch for a minor version (e.g., `0.5`) |

## See Also

- [Configuration Guide](/user-guide/configuration) — Full config documentation
- [Environment Variables](/reference/environment-variables) — All environment variables
- [Config File Reference](/reference/config-file) — Complete config schema
