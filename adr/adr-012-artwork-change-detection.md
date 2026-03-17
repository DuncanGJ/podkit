---
title: "ADR-012: Artwork Change Detection"
description: Design decisions for detecting and propagating artwork changes to iPod devices.
sidebar:
  order: 13
---

# ADR-012: Artwork Change Detection

## Status

**Accepted** (2026-03-16)

## Context

The self-healing sync (ADR-009) previously only detected artwork presence (added/absent). Users who updated artwork in their collections had no way to propagate changes to their iPod without removing and re-adding tracks. This ADR documents the design decisions for hash-based artwork change detection.

## Decision Drivers

- Detect artwork changes without re-transferring audio files
- Minimize cost for sources where artwork retrieval is expensive (e.g., Subsonic requires an HTTP request per unique album)
- Work within the existing sync tag infrastructure
- Node.js compatibility for podkit-core (no native-only dependencies)
- Backward compatibility with existing sync tags

## Decisions

### 1. Hash Algorithm: SHA-256 Truncated to 32 Bits

SHA-256 is used, truncated to a 32-bit (8-character hex) string stored in the sync tag as `art=XXXXXXXX`.

**Why SHA-256 over xxHash/wyhash:** podkit-core must run on Node.js, which provides SHA-256 natively via `crypto.createHash()`. Fast hash libraries like xxHash and wyhash require native addons, adding build complexity for no meaningful gain — hashing a single artwork image per track is not a bottleneck.

**Why 32 bits is sufficient:** A 32-bit hash provides ~4 billion distinct values. For a music collection, the probability of a collision is negligible. Even at 100,000 tracks, the birthday paradox probability is approximately 0.1%. A collision would merely cause a missed artwork update on one sync cycle — not data loss.

### 2. Sync Tag Storage

The artwork hash is stored alongside quality and encoding information in the existing sync tag format. This avoids introducing a new metadata field and keeps all sync state in one place.

**Progressive writes:** The hash is written whenever artwork is transferred to the device, regardless of whether `--check-artwork` is active. This builds baseline hashes naturally over time as tracks are added or updated, so that future `--check-artwork` runs have something to compare against.

### 3. Opt-in Detection via --check-artwork

Scanning and diffing artwork hashes is opt-in via the `--check-artwork` flag.

**Why opt-in:** For some sources, computing the artwork hash requires fetching artwork data. For Subsonic, this means an HTTP request to `getCoverArt` per unique album — potentially hundreds of requests that significantly slow down sync. For directory sources the cost is lower (reading embedded artwork from local files), but still non-trivial for large collections.

**Always-on writes:** Writing hashes to sync tags is always enabled because the artwork bytes are already in memory during transfer — computing a hash adds negligible overhead.

**Establishing baselines:** Users with existing synced libraries can populate artwork hashes by running `podkit sync --force-sync-tags --check-artwork`. This writes hashes for all tracks without re-transferring any files.

### 4. Subsonic Adapter: hasArtwork Set to undefined

The Subsonic API's `coverArt` field is always populated by servers like Navidrome, even for tracks that have no actual artwork. This means the presence of `coverArt` cannot be used to reliably determine whether a track has artwork.

**Decision:** The Subsonic adapter sets `hasArtwork` to `undefined` (unknown) rather than `true` or `false`. This prevents false `artwork-added` and `artwork-removed` detections during sync. The `artwork-updated` operation still works correctly via hash comparison when `--check-artwork` is enabled, because it compares actual artwork bytes rather than relying on presence metadata.

**Future improvement:** TASK-141 tracks planned work to fetch artwork from the `getCoverArt` endpoint to verify presence, which would enable `artwork-added`/`artwork-removed` detection for Subsonic sources.

### 5. Adapter Hash Preference for Sync Tags

When writing the artwork hash to a sync tag, the source adapter's `artworkHash` is preferred over re-hashing bytes from `extractArtwork()`.

**Why:** Subsonic servers may process or resize artwork served via `getCoverArt`, so the bytes returned from the API may differ from the artwork embedded in the downloaded audio file. Using the adapter's hash ensures consistency: the same hash source is used for both writing (during sync) and comparison (during `--check-artwork` scans). If the adapter does not provide a hash, the system falls back to hashing the extracted artwork bytes.

### 6. Metadata-only Operations

`artwork-updated` and `artwork-removed` are metadata-only operations — they update or remove the iPod's artwork without re-transferring the audio file. `artwork-added` remains a file-replacement operation, preserving existing behavior where the full track file is re-sent to ensure artwork is embedded.

This is possible because libgpod supports setting and removing artwork independently of audio files via `setTrackArtwork()` and `removeTrackArtwork()`.

### 7. Sync Tag Consistency Model

A sync tag is "consistent" when it accurately reflects the track's actual state on the iPod:

| Display | Meaning |
|---------|---------|
| ✓ | Sync tag is present and artwork hash matches (or track has no artwork and no `art=` field) |
| ◐ | Sync tag is present but missing the artwork hash — baseline not yet established |
| ✗ | No sync tag at all |

Tracks without artwork do not need an `art=` hash in their sync tag. They are considered consistent without one, since there is nothing to track.

## Consequences

### Positive

- Users can detect and update changed artwork with `--check-artwork`
- Progressive hash writes mean baselines accumulate naturally without user intervention
- No new native dependencies — uses Node.js built-in crypto
- Backward compatible — existing sync tags without `art=` continue to work
- Metadata-only updates avoid expensive audio re-transfers for artwork changes

### Negative

- Subsonic `artwork-added`/`artwork-removed` detection is deferred until TASK-141
- Users must opt in to `--check-artwork` to detect changes (writes are automatic, reads are not)
- 32-bit hash has a theoretical (though negligible) collision risk

## Related Decisions

- [ADR-009](adr-009-self-healing-sync.md): Self-healing sync — artwork change detection extends the upgrade detection system
- [ADR-004](adr-004-collection-sources.md): Collection source abstraction — adapter pattern enables per-source artwork behavior
