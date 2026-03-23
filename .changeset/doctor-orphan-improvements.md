---
"podkit": patch
---

Improve `podkit doctor` orphan file reporting. Orphan detection now skips macOS `._` resource fork files that were inflating the count. Add `--verbose` output showing orphan breakdown by directory, file extension, and the 10 largest files. Add `--format csv` to export the full orphan file list for inspection.
