---
'podkit': patch
---

Fix `--delete` flag removing video tracks when syncing music (and vice versa). The delete flag now only considers tracks of the content type being synced.
