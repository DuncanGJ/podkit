---
'podkit': patch
'@podkit/core': patch
---

Fix video sync deleting and re-adding episodes with episode number 0 (e.g., S01E00)

The `||` operator treated episode/season number `0` as falsy, converting it to `undefined`. This broke diff key matching for episode 0, causing every sync to delete and re-add the video. Changed to `??` (nullish coalescing) which only converts `null`/`undefined`, preserving `0` as a valid value.
