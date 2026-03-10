---
title: Album Artist Transform
description: Clean up messy artist lists on your iPod by moving featured artist credits into the track title.
sidebar:
  order: 5
---

## The Problem: Messy Artist Lists on iPod

Classic iPods do not use the Album Artist field for navigation. When you browse by Artist on an iPod, it uses the track-level Artist field. If your music library tags tracks as "Kendrick Lamar feat. SZA" or "Tyler, the Creator ft. Pharrell", you end up with dozens of one-off artist entries cluttering your artist list:

- Daft Punk
- Daft Punk feat. Julian Casablancas
- Daft Punk feat. Pharrell Williams
- Daft Punk feat. Pharrell Williams & Nile Rodgers
- Daft Punk feat. Todd Edwards

What you actually want to see is just **Daft Punk**, with the featured artist credit preserved somewhere useful.

## The Solution: ftintitle

The `ftintitle` transform solves this by moving featured artist credits from the Artist field into the Title field during sync. Your source files are never modified -- the transform only affects what gets written to the iPod.

This is inspired by the [beets ftintitle plugin](https://beets.readthedocs.io/en/stable/plugins/ftintitle.html), which does the same thing when importing music into a beets library.

### Before and After

| | Artist | Title |
|---|--------|-------|
| **Before** | Daft Punk feat. Pharrell Williams | Get Lucky |
| **After** | Daft Punk | Get Lucky (feat. Pharrell Williams) |

| | Artist | Title |
|---|--------|-------|
| **Before** | A ft. B | Song (Radio Edit) |
| **After** | A | Song (feat. B) (Radio Edit) |

| | Artist | Title |
|---|--------|-------|
| **Before** | Artist A featuring Artist B | Track Name |
| **After** | Artist A | Track Name (feat. Artist B) |

Your iPod artist list goes from a mess of one-off entries to a clean, browsable list -- and you still see who is featured in the track title.

## Configuration

Enable the transform in your `config.toml`:

```toml
[transforms.ftintitle]
enabled = true
```

### Full Options

```toml
[transforms.ftintitle]
enabled = true       # Enable the transform (default: false)
drop = false         # If true, drop feat. info entirely (default: false)
format = "feat. {}"  # Format string, {} is replaced with featured artist
ignore = ["Simon & Garfunkel"]  # Don't split these artist names
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `false` | Whether the transform is active |
| `drop` | boolean | `false` | If `true`, drop featuring info entirely instead of moving to title |
| `format` | string | `"feat. {}"` | Format string for featuring text in title (`{}` is replaced with artist names) |
| `ignore` | string[] | `[]` | Artist names to ignore when splitting on ambiguous separators (`and`, `&`, `with`) |

### The ignore List

Some artist names naturally contain words like "and", "&", or "with" that the transform would otherwise treat as featuring indicators. Add these to the `ignore` list to prevent incorrect splitting:

```toml
[transforms.ftintitle]
enabled = true
ignore = ["Simon & Garfunkel", "Hall & Oates", "Earth, Wind & Fire"]
```

### Per-Device Override

You can override transform settings for specific devices:

```toml
[devices.myipod.transforms.ftintitle]
enabled = true
format = "feat. {}"

[devices.nano]
# No transforms configured -- uses original metadata
```

## Patterns Recognized

The transform recognizes these featuring indicators (case-insensitive):

- `feat.` / `feat`
- `featuring`
- `ft.` / `ft`
- `with`
- `vs`
- `and` / `&` / `con`

## Bracket Positioning

When the title contains brackets like `(Remix)` or `(Live)`, the featuring info is inserted *before* them:

- Input: Artist `"A ft. B"`, Title `"Song (Radio Edit)"`
- Output: Artist `"A"`, Title `"Song (feat. B) (Radio Edit)"`

Keywords that trigger this positioning:
`remix`, `edit`, `live`, `remaster`, `version`, `mix`, `instrumental`, `extended`, `demo`, `acapella`, `club`, `radio`, `vip`, `rmx`

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Title already has feat. info | Skip (don't double-add) |
| No featuring indicator | Pass through unchanged |
| `drop = true` | Remove feat. from artist, don't add to title |

## Reversibility

Transforms are reversible. If you disable a transform and re-sync, podkit updates the iPod tracks back to their original metadata. Your source files are never touched.

## CLI Output

When transforms are active, `podkit sync --dry-run` shows what will change:

```
Transforms:
  ftintitle: enabled (format: "feat. {}")

Summary:
  Tracks to add: 5
  Tracks to update: 147
    Apply ftintitle: 145
    Metadata changed: 2
  Tracks to remove: 0
  Already synced: 1,262

Tracks to update (transform):
  Artist A feat. Artist B - Song Name
    -> Artist: "Artist A"
    -> Title: "Song Name (feat. Artist B)"
```

## Attribution

The ftintitle transform is ported from the [beets ftintitle plugin](https://beets.readthedocs.io/en/stable/plugins/ftintitle.html):

> Original: Copyright 2016, Verrus
> Source: https://github.com/beetbox/beets/blob/master/beetsplug/ftintitle.py
> License: MIT

## See Also

- [Configuration](/user-guide/configuration) - Config file options
- [CLI Commands](/reference/cli-commands) - Command-line reference
