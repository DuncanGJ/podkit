---
title: Adding a Device
description: Register iPod devices with podkit using auto-detection or manual configuration.
sidebar:
  order: 2
---

Before you can sync music to an iPod, you need to register it with podkit. This page covers automatic and manual device registration.

## Auto-Detection with `podkit device add`

The easiest way to register a device is to plug it in and let podkit detect it:

```bash
# With the iPod mounted, auto-detect and register
podkit device add

# Give the device a specific name
podkit device add --name classic
```

podkit reads the volume UUID and name from the mounted filesystem and adds the device to your config file.

## Manual Configuration

You can also add a device by editing `~/.config/podkit/config.toml` directly:

```toml
[devices.classic]
volumeUuid = "ABCD-1234"
volumeName = "CLASSIC"
```

### Finding the Volume UUID

On macOS, use `diskutil` to find the UUID of your mounted iPod:

```bash
diskutil info /Volumes/IPOD | grep "Volume UUID"
```

On Linux, use `blkid`:

```bash
sudo blkid /dev/sdX1
```

### Configuration Options

| Option | Description | Required |
|--------|-------------|----------|
| `volumeUuid` | Filesystem UUID used to identify the device | Yes |
| `volumeName` | Volume label shown in Finder/file manager | Yes |
| `quality` | Transcoding quality preset for this device | No |
| `artwork` | Whether to sync album artwork | No |

The `volumeUuid` uniquely identifies the device regardless of which port or mount point it uses. The `volumeName` is the label shown when the iPod mounts (e.g., "IPOD", "CLASSIC").

## Removing a Device

To unregister a device:

```bash
podkit device remove classic
```

This removes the device entry from your config file. It does not modify anything on the iPod itself.

## See Also

- [Supported Devices](/devices/supported-devices/) for iPod model compatibility
- [Managing Devices](./) for working with multiple devices
- [Mounting and Ejecting](./mounting-ejecting/) for connecting devices
