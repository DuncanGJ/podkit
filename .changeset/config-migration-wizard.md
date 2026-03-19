---
"podkit": minor
---

Add config migration system with `podkit migrate` command

Config files now have a `version` field. Running any command with an outdated config shows a clear error directing you to run `podkit migrate`. The migrate command detects your config version, shows what will change, backs up your original file, and applies updates. Supports `--dry-run` to preview changes and interactive migrations that can prompt for decisions. Configs without a version field are treated as version 0 and can be migrated with `podkit migrate`.
