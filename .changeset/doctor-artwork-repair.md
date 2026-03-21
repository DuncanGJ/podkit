---
"podkit": minor
"@podkit/core": minor
---

Add `podkit doctor` command for running health checks on an iPod. The first check detects artwork corruption where the ArtworkDB references byte offsets beyond ithmb file boundaries. Use `podkit doctor --repair-artwork` to rebuild all artwork from your source collection, or `--dry-run` to preview what would change. Includes a binary ArtworkDB parser, integrity checker, and repair orchestrator in @podkit/core.
