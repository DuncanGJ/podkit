---
title: Installation
description: Install podkit and its system dependencies on macOS or Linux.
sidebar:
  order: 1
---

podkit supports **macOS** and **Linux**.

:::note[Windows support]
Windows is not currently supported. If you'd like to see Windows support, please [open an issue on GitHub](https://github.com/jvgomg/podkit/issues) to let us know.
:::

## Prerequisites

Before installing podkit, you need:

- **Node.js 20+** or **Bun** - JavaScript runtime ([nodejs.org](https://nodejs.org/) or [bun.sh](https://bun.sh/))
- **FFmpeg** - Audio transcoding (FLAC to AAC)
- **A supported iPod** - See [Supported Devices](/devices/supported-devices)

> **Note:** iOS devices (iPod Touch, iPhone, iPad) are not supported. podkit works with classic iPods that use USB Mass Storage mode.

## Step 1: Install Node.js or Bun

podkit runs on Node.js 20+ or Bun. Install whichever you prefer:

### Node.js

#### macOS

```bash
brew install node
```

#### Ubuntu/Debian

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Fedora

```bash
sudo dnf install nodejs
```

Verify: `node --version` (should show v20.x or higher)

### Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

Verify: `bun --version`

## Step 2: Install FFmpeg

### macOS

```bash
brew install ffmpeg
```

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install -y ffmpeg
```

### Fedora

```bash
# Enable RPM Fusion for FFmpeg
sudo dnf install -y \
    https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm

sudo dnf install -y ffmpeg
```

### Arch Linux

```bash
sudo pacman -S ffmpeg
```

:::tip[libgpod is included]
podkit ships with prebuilt native binaries for iPod database support. You **do not** need to install libgpod separately. Prebuilt binaries are available for macOS (Intel and Apple Silicon) and Linux (x64).
:::

## Step 3: Install podkit

```bash
npm install -g podkit
# or
bun install -g podkit
```

Verify installation:

```bash
podkit --version
```

## Verify Your Setup

Run these commands to confirm everything is working:

```bash
# Check FFmpeg
ffmpeg -version | head -1

# Check FFmpeg has AAC support
ffmpeg -encoders 2>/dev/null | grep aac

# Check podkit
podkit --version
```

## Building from Source

If prebuilt binaries are not available for your platform, podkit will attempt to build the native module from source during installation. This requires **libgpod** development headers:

### macOS (building from source)

```bash
# Build and install libgpod (not available in Homebrew)
git clone https://github.com/jvgomg/podkit.git
cd podkit/tools/libgpod-macos
./build.sh
```

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export PKG_CONFIG_PATH="$HOME/.local/lib/pkgconfig:$PKG_CONFIG_PATH"
export DYLD_LIBRARY_PATH="$HOME/.local/lib:$DYLD_LIBRARY_PATH"
```

### Ubuntu/Debian (building from source)

```bash
sudo apt install -y libgpod-dev
```

### Fedora (building from source)

```bash
sudo dnf install -y libgpod-devel
```

### Arch Linux (building from source)

```bash
sudo pacman -S libgpod
```

## Next Steps

Once installed, continue to:

- [Quick Start](/getting-started/quick-start) - Get syncing in 5 minutes
- [First Sync](/getting-started/first-sync) - Detailed walkthrough of your first sync
