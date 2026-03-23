---
"@podkit/core": patch
---

Fix track removal leaving orphan files on iPod. When removing tracks during sync (both music and video), the audio/video file was deleted from the iPod database but left on disk, accumulating orphan files over time. `track.remove()` now deletes the file by default. Pass `{ keepFile: true }` to preserve the file on disk.
