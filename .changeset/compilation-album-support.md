---
"@podkit/core": minor
"podkit": minor
---

Add compilation album support to sync pipeline and CLI display. Compilation metadata from source files (FLAC, MP3, M4A) and Subsonic servers is now correctly written to the iPod database, ensuring compilation albums appear under "Compilations" on the iPod. The `device music` and `collection music` commands show compilation counts in stats, mark compilation albums in `--albums` view, and support a `compilation` field for `--fields`.
