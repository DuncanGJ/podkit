---
title: Mounting and Ejecting
description: Mount and safely eject iPod devices with podkit on macOS.
sidebar:
  order: 5
---

podkit provides commands to mount and safely eject iPod devices. Proper ejecting is important to avoid database corruption on the iPod.

## Mounting

Mount a registered device:

```bash
# Mount the default device
podkit device mount

# Mount a specific device
podkit device mount classic
```

podkit identifies the device by its `volumeUuid` and mounts it to the expected mount point.

## Ejecting

Safely eject after syncing:

```bash
# Eject the default device
podkit device eject

# Eject a specific device
podkit device eject nano
```

Ejecting flushes all pending writes and unmounts the volume. Always eject before disconnecting the iPod.

### Auto-Eject After Sync

Use `--eject` to automatically eject the device when a sync completes:

```bash
podkit sync --eject
podkit sync --device nano --eject
```

This is convenient for a plug-sync-unplug workflow.

## Platform Support

### macOS (Primary)

macOS is the primary supported platform. Mount and eject commands work with both standard iPod connections and iFlash-modified devices.

If you have trouble with iFlash-based iPods not mounting correctly, see the [macOS Mounting Troubleshooting](/troubleshooting/macos-mounting/) guide.

### Linux

Linux support does not exist yet. While podkit's core functionality (syncing, transcoding) works on Linux, the mount and eject commands are not implemented for Linux volume management.

:::note[Want Linux mount/eject support?]
This feature is on the [roadmap](/roadmap/). Vote and comment on the [discussion](https://github.com/jvgomg/podkit/discussions/9) to help us prioritise. In the meantime, you can mount and eject your iPod using standard Linux tools (`mount`, `umount`, `udisksctl`).
:::

## See Also

- [Managing Devices](./) for device configuration
- [macOS Mounting Troubleshooting](/troubleshooting/macos-mounting/) for iFlash and mount issues
- [Adding a Device](./adding-devices/) for registering devices
