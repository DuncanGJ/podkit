---
"podkit": patch
"@podkit/core": patch
---

Improve iPod eject reliability with automatic retry and filesystem sync

- Use `diskutil eject` instead of `diskutil unmount` on macOS for proper removable-media handling (unmounts + detaches the disk)
- Flush filesystem buffers before ejecting to ensure all writes are persisted
- Automatically retry eject up to 3 times when the device is temporarily busy (common on macOS when Finder/Spotlight holds a reference)
- Show progress output during retry so you know what's happening
- On Linux, return busy errors from udisksctl immediately so the retry wrapper can handle them instead of silently falling through
