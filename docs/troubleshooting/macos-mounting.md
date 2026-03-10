---
title: macOS Mounting Issues
description: Troubleshoot and fix mounting issues for large-capacity iPods using iFlash on macOS.
sidebar:
  order: 2
---

Large-capacity iPods using iFlash adapters with SD cards may fail to mount automatically on macOS. This issue was [originally documented by u/Efficient_Pattern on Reddit](https://www.reddit.com/r/IpodClassic/comments/1o6nk41/mounting_issues_workaround_with_1tb_ipodsiflash/).

## Symptoms

- iPod appears in Finder's sidebar but shows infinite spinning wheel
- Disk volume does not mount
- iPod does not appear in Music app
- `diskutil list` shows the device but it's not accessible

This affects iPods with 1TB+ storage (iFlash Quad with multiple SD cards). The issue occurs because macOS refuses to automatically mount very large FAT32 volumes.

## Using podkit mount

If your device is registered with podkit, the easiest solution is the built-in mount command:

```bash
podkit mount
```

This auto-detects the disk identifier and mounts it for you. You can also specify the disk identifier directly:

```bash
podkit mount --disk /dev/disk4s2
```

See [Mounting and Ejecting](/user-guide/devices/mounting-ejecting) for more details.

## Manual Workaround

### 1. Find the disk identifier

```bash
diskutil list
```

Look for your iPod - it will show as `DOS_FAT_32` with a name like "IPOD" or similar:

```
/dev/disk4 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *1.0 TB     disk4
   1:                 DOS_FAT_32 IPOD                    1.0 TB     disk4s2
```

Note the identifier (e.g., `disk4s2`).

### 2. Mount manually

```bash
sudo mkdir -p /Volumes/iPod
sudo mount -t msdos /dev/disk4s2 /Volumes/iPod
```

Replace `disk4s2` with your actual identifier and `iPod` with your preferred mount name.

### 3. Verify the mount

```bash
ls /Volumes/iPod/iPod_Control
```

You should see: `Artwork`, `Device`, `iTunes`, `Music`

## Convenience Alias

Add this to your `~/.zshrc` (or `~/.bashrc`) to auto-detect and mount the iPod:

```bash
alias ipod='dev=$(diskutil list | awk "/IPOD/ && /disk[0-9]+s[0-9]+/ {print \$NF; exit}"); [ -n "$dev" ] && sudo mkdir -p /Volumes/iPod && sudo mount -t msdos /dev/$dev /Volumes/iPod || echo "iPod volume not found"'
```

Adjust the `IPOD` pattern to match your iPod's volume name.

## Hidden Files in Finder

The `iPod_Control` folder is hidden by default. To see it in Finder:

- Press `Cmd + Shift + .` to toggle hidden files, or
- Run `chflags nohidden /Volumes/iPod/iPod_Control`

## Ejecting

Unmount before disconnecting:

```bash
diskutil unmount /Volumes/iPod
```

Note: `sudo umount` often fails with "Resource busy" on macOS. Use `diskutil unmount` instead.

Or use podkit:

```bash
podkit eject
```

## See Also

- [Mounting and Ejecting](/user-guide/devices/mounting-ejecting) - podkit mount/eject commands
- [Supported Devices](/devices/supported-devices) - Device compatibility
- [iPod Internals](/devices/ipod-internals) - Device technical details
