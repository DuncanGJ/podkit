---
"podkit": minor
---

Standardize CLI to use named flags instead of positional arguments

**Breaking change** (minor bump — not ready for v1 yet).

All device names, collection names, and sync types are now specified with named flags:

- `-d, --device <name>` for device name (global flag, now with `-d` shorthand)
- `-c, --collection <name>` for collection name
- `-t, --type <type>` for sync/collection type (music, video; repeatable)
- `--path <path>` for paths in `device add` and `collection add`

Before:
```
podkit sync music -c main
podkit device add myipod /Volumes/IPOD
podkit device info myipod
podkit collection add music main ~/Music
```

After:
```
podkit sync -t music -c main
podkit device add -d myipod --path /Volumes/IPOD
podkit device info -d myipod
podkit collection add -t music -c main --path ~/Music
```
