---
id: TASK-066
title: Investigate playcount/scrobble sync to ListenBrainz and other services
status: To Do
assignee: []
created_date: '2026-02-26 14:38'
labels:
  - research
  - feature
  - integrations
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Overview

iPods track play counts locally. When users sync, this play data could be exported to third-party services like ListenBrainz, Last.fm, or other scrobbling platforms.

## Use Case

User listens to music on iPod (offline). When they connect to sync, podkit reads play counts from iPod and submits scrobbles to their preferred service.

## Research Questions

### 1. iPod Play Count Storage

- Where does libgpod store play counts?
- Can we read "plays since last sync" vs "total plays"?
- Is there timestamp data (when tracks were played)?
- How does iTunes handle this?

### 2. ListenBrainz API

- https://listenbrainz.org/
- What's the submission API?
- Authentication method?
- Rate limits?
- Required fields (artist, track, timestamp)?

### 3. Other Services

- Last.fm scrobble API
- Maloja (self-hosted)
- Generic webhook option?

### 4. Implementation Approaches

**Option A: Built-in support**
```bash
podkit scrobble --service listenbrainz
```

**Option B: Export for external tools**
```bash
podkit plays export --format json > plays.json
# User feeds to their scrobbler of choice
```

**Option C: Plugin/hook system**
```bash
podkit sync --post-hook "scrobble-plays.sh"
```

## Challenges

- **Timestamps:** iPod may not store when a track was played, just that it was
- **Duplicates:** Avoiding re-scrobbling already-submitted plays
- **Offline plays:** Multiple plays of same track since last sync

## Minimum Viable Feature

1. Read play counts from iPod via libgpod
2. Export to JSON/CSV with track metadata
3. User can feed to external scrobbler

## Future Enhancements

- Direct ListenBrainz integration
- Track "last scrobbled" state to avoid duplicates
- Timestamp estimation based on sync intervals

## References

- ListenBrainz API: https://listenbrainz.readthedocs.io/
- libgpod play counts: Check `Itdb_Track` struct for playcount fields
- Last.fm API: https://www.last.fm/api/scrobbling
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 iPod play count storage researched (libgpod API)
- [ ] #2 ListenBrainz API reviewed
- [ ] #3 Implementation approach recommended
- [ ] #4 MVP scope defined
<!-- AC:END -->
