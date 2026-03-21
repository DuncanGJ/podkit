---
'@podkit/core': patch
---

Add album-level artwork cache to sync executor, reducing redundant artwork extractions by ~10x (one extraction per album instead of per track). The cache is shared with the doctor repair routine via a new `AlbumArtworkCache` abstraction.
