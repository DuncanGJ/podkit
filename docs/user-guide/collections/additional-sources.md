---
title: Additional Sources
description: Planned collection sources and how to request or build your own.
sidebar:
  order: 4
---

podkit currently supports [directory](/user-guide/collections/directory) and [Subsonic](/user-guide/collections/subsonic) collection sources. Additional sources are planned for the future.

## Planned Sources

### Plex

Support for syncing music from [Plex](https://www.plex.tv/) media servers is planned. This would allow you to sync your Plex music library directly to your iPod without needing local files.

### Jellyfin

Support for [Jellyfin](https://jellyfin.org/) media servers is also planned. Like the Subsonic source, this would stream and cache tracks from your Jellyfin server for syncing.

## Request a Source

If there's a music source you'd like to see supported, [open an issue on GitHub](https://github.com/jvgomg/podkit/issues) describing the source and your use case.

## Build Your Own

podkit's collection source system uses an adapter pattern that makes it possible to add new sources. If you're interested in building a source adapter, see the [Developer Guide](/developers/architecture) for an overview of the adapter interface and how collection sources work.

## See Also

- [Directory Source](/user-guide/collections/directory) - Local directory source
- [Subsonic Source](/user-guide/collections/subsonic) - Subsonic/Navidrome server source
