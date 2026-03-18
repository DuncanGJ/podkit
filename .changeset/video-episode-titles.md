---
"@podkit/core": patch
---

Fix video episode titles showing series name instead of episode ID

TV show episodes without an explicit episode title in the filename (e.g., `Show - S01E01.mkv`) now display as `S01E01` on iPod instead of repeating the series name. Episodes with titles show as `S01E01 - Episode Title`.
