---
"podkit": minor
---

Add stats, albums, and artists views to content listing commands

- `device music`, `device video`, `collection music`, and `collection video` now show summary stats by default (track/album/artist counts and file type breakdown)
- Add `--tracks` flag to list all tracks (previous default behavior)
- Add `--albums` flag to list albums with track counts
- Add `--artists` flag to list artists with album/track counts
- `--tracks --json` on device commands now includes all iPod metadata fields (play stats, timestamps, video fields, etc.)
