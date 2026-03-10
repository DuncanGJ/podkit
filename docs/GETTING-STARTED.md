# Getting Started with podkit

This guide walks you through installing podkit and syncing music to your iPod for the first time.

## Prerequisites

Before installing podkit, you'll need:

- **Node.js 20+** - JavaScript runtime ([nodejs.org](https://nodejs.org/))
- **FFmpeg** - Audio transcoding (FLAC → AAC)
- **libgpod** - iPod database library
- **A supported iPod** - See [Supported Devices](SUPPORTED-DEVICES.md)

> **Note:** iOS devices (iPod Touch, iPhone, iPad) are not supported. podkit works with classic iPods that use USB Mass Storage mode.

## Installation

### Step 1: Install Node.js

If you don't have Node.js installed:

**macOS:**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Fedora:**
```bash
sudo dnf install nodejs
```

Verify installation:
```bash
node --version  # Should show v20.x or higher
```

### Step 2: Install System Dependencies

#### macOS

```bash
# Install FFmpeg
brew install ffmpeg

# Build and install libgpod (not available in Homebrew)
# Clone podkit first, then run the build script:
git clone https://github.com/your-org/podkit.git
cd podkit/tools/libgpod-macos
./build.sh
```

The build script installs libgpod to `~/.local`. Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export PKG_CONFIG_PATH="$HOME/.local/lib/pkgconfig:$PKG_CONFIG_PATH"
export DYLD_LIBRARY_PATH="$HOME/.local/lib:$DYLD_LIBRARY_PATH"
```

Reload your shell:
```bash
source ~/.zshrc  # or ~/.bashrc
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install -y libgpod-dev ffmpeg
```

#### Fedora

```bash
# Enable RPM Fusion for FFmpeg
sudo dnf install -y \
    https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm

sudo dnf install -y libgpod-devel ffmpeg
```

#### Arch Linux

```bash
sudo pacman -S libgpod ffmpeg
```

### Step 3: Install podkit

```bash
npm install -g podkit
```

Verify installation:
```bash
podkit --version
```

## Initial Setup

### Create Configuration File

Run the init command to create a default configuration:

```bash
podkit init
```

This creates `~/.config/podkit/config.toml` with a template configuration.

### Configure Your Music Collection

Edit the config file to point to your music directory:

```bash
# Open in your preferred editor
nano ~/.config/podkit/config.toml
# or
code ~/.config/podkit/config.toml
```

Add your music collection:

```toml
# Music collections
[music.main]
path = "/path/to/your/music"

# Defaults
[defaults]
music = "main"
```

Replace `/path/to/your/music` with the actual path to your music library.

### Register Your iPod

1. Connect your iPod to your computer
2. Wait for it to mount (appears in Finder/Files)
3. Register it with podkit:

```bash
podkit device add myipod
```

This auto-detects the connected iPod and saves its identity to your config. The name `myipod` is just a friendly identifier — use whatever you like.

4. Set it as the default device:

```bash
# The device add command will prompt you to set as default
# Or manually edit config.toml:
[defaults]
device = "myipod"
```

### Verify Setup

Check that podkit can see your iPod:

```bash
podkit device info
```

This shows device details, storage space, and current track count.

## Your First Sync

### Preview Changes (Dry Run)

Before syncing, preview what podkit will do:

```bash
podkit sync --dry-run
```

This shows:
- How many tracks will be added
- How many need transcoding (FLAC → AAC)
- Estimated size and time
- Any tracks that would be removed (if using `--delete`)

### Run the Sync

When you're happy with the plan, run the sync:

```bash
podkit sync
```

podkit will:
1. Scan your music collection
2. Compare with tracks already on the iPod
3. Transcode files that need conversion (FLAC → AAC)
4. Copy files to the iPod
5. Update the iPod database

### Eject Safely

After syncing, eject the iPod safely:

```bash
podkit eject
```

Or use `--eject` flag during sync to auto-eject on success:

```bash
podkit sync --eject
```

## Common Commands

### Check Device Status

```bash
podkit device info              # Show device details and storage
podkit device music             # List all music on iPod
podkit device music --format json  # Machine-readable output
```

### Sync Options

```bash
# Preview changes without syncing
podkit sync --dry-run

# Sync and remove tracks not in source
podkit sync --delete

# Sync specific collection
podkit sync -c main

# Sync music only (skip video)
podkit sync music

# Sync to specific device
podkit sync --device myipod

# Use different quality preset
podkit sync --quality medium

# Skip artwork transfer (faster)
podkit sync --no-artwork

# Verbose output
podkit sync -v
```

### Quality Presets

podkit transcodes lossless files (FLAC, WAV, ALAC) to AAC for iPod compatibility:

| Preset | Bitrate | Use Case |
|--------|---------|----------|
| `alac` | Lossless | Keep original quality (larger files) |
| `max` | ~256 kbps VBR | Highest AAC quality |
| `high` | ~192 kbps VBR | Good quality, reasonable size (default) |
| `medium` | ~128 kbps VBR | Smaller files, good for limited storage |
| `low` | ~96 kbps VBR | Maximum compression |

Set quality in config or via CLI:

```toml
# In config.toml
quality = "high"
```

```bash
# Or via CLI
podkit sync --quality medium
```

### Multiple Collections

You can configure multiple music sources:

```toml
[music.main]
path = "/Volumes/Media/music/library"

[music.podcasts]
path = "/Volumes/Media/podcasts"

[defaults]
music = "main"
```

Sync a specific collection:

```bash
podkit sync -c podcasts
```

### Multiple Devices

Configure multiple iPods with different settings:

```toml
[devices.classic]
volumeUuid = "ABC-123"
volumeName = "CLASSIC"
quality = "high"
artwork = true

[devices.nano]
volumeUuid = "DEF-456"
volumeName = "NANO"
quality = "medium"
artwork = false

[defaults]
device = "classic"
```

Sync to a specific device:

```bash
podkit sync --device nano
```

## Video Sync

If you have an iPod that supports video (iPod Video, iPod Classic, Nano 3rd-5th gen):

```toml
[video.movies]
path = "/path/to/movies"

[defaults]
video = "movies"
```

Sync video content:

```bash
podkit sync video           # Sync video only
podkit sync                 # Sync both music and video
podkit sync --dry-run       # Preview music + video changes
```

Video files are automatically transcoded to iPod-compatible H.264/M4V format.

## Troubleshooting

### "iPod not found" or "Device path not found"

**Symptoms:** podkit can't detect your iPod

**Solutions:**
1. Make sure the iPod is mounted (visible in Finder/Files)
2. Check the mount point: `ls /Volumes/` (macOS) or `lsblk` (Linux)
3. Try specifying the path directly: `podkit sync --device /Volumes/IPOD`
4. On macOS with large iFlash cards, see [MACOS-IPOD-MOUNTING.md](MACOS-IPOD-MOUNTING.md)

### "Cannot read iPod database"

**Symptoms:** iPod is mounted but podkit can't read it

**Solutions:**
1. The iPod may need initialization. If it's a fresh iPod or was recently restored:
   ```bash
   podkit device init --device /Volumes/IPOD
   ```
2. Check if the iPod_Control folder exists: `ls /Volumes/IPOD/iPod_Control/`
3. Try restoring the iPod with iTunes/Finder first

### "FFmpeg not found"

**Symptoms:** Sync fails because FFmpeg isn't available

**Solutions:**
1. Install FFmpeg (see Step 2 above)
2. Verify it's in your PATH: `which ffmpeg`
3. Check it has AAC support: `ffmpeg -encoders 2>/dev/null | grep aac`

### "Failed to load libgpod" or "Library not found"

**Symptoms:** podkit can't load the libgpod library

**Solutions:**
1. Verify libgpod is installed: `pkg-config --modversion libgpod-1.0`
2. On macOS, ensure environment variables are set (see Step 2)
3. Try rebuilding: `cd tools/libgpod-macos && ./build.sh`

### Sync is slow

**Tips to speed up sync:**
1. Use `--no-artwork` to skip artwork transfer
2. Use a lower quality preset (`--quality medium`)
3. Pre-convert your files to AAC/MP3 (no transcoding needed)
4. Use a fast SD card if using iFlash

### Tracks appear corrupted on iPod

**Symptoms:** Tracks skip, won't play, or show wrong duration

**Solutions:**
1. Eject properly with `podkit eject` before disconnecting
2. Check the source files play correctly on your computer
3. Try re-syncing with `--delete` to remove and re-add tracks

### Getting verbose output

For debugging, use multiple `-v` flags:

```bash
podkit sync -v      # Verbose
podkit sync -vv     # More verbose
podkit sync -vvv    # Debug level
```

### Getting help

```bash
podkit --help           # General help
podkit sync --help      # Sync command help
podkit device --help    # Device command help
```

## Next Steps

- Read [SUPPORTED-DEVICES.md](SUPPORTED-DEVICES.md) for device compatibility details
- See [TRANSCODING.md](TRANSCODING.md) for quality preset details
- Check [VIDEO-TRANSCODING.md](VIDEO-TRANSCODING.md) for video sync options
- Explore [TRANSFORMS.md](TRANSFORMS.md) for metadata transforms (e.g., moving "feat." to title)

## Getting Help

- Check the [Troubleshooting](#troubleshooting) section above
- Search existing issues: [GitHub Issues](https://github.com/your-org/podkit/issues)
- Open a new issue with verbose output (`podkit sync -vvv`)
