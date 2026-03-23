---
id: TASK-207
title: Investigate video artwork/thumbnail support and transferMode integration
status: To Do
assignee: []
created_date: '2026-03-23 14:35'
labels:
  - investigation
  - video
  - transcoding
dependencies:
  - TASK-202
references:
  - packages/podkit-core/src/sync/video-planner.ts
  - packages/podkit-core/src/sync/video-executor.ts
  - packages/podkit-core/src/transcode/ffmpeg.ts
  - packages/podkit-core/src/ipod/generation.ts
documentation:
  - backlog/docs/doc-011 - PRD--Transfer-Mode.md
  - backlog/docs/doc-012 - Spec--Transfer-Mode-Behavior-Matrix.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The video sync pipeline currently has no attention to artwork or thumbnail support. With the introduction of `transferMode` for music, we need to consider whether and how it applies to video content.

**PRD:** DOC-011 (Transfer Mode)

**Context:** The only video-capable iPod currently in use is a 5th gen iPod Video, which does not display video thumbnails or artwork in its menu. However, other iPod models (Classic 6G/7G, Nano 3G-5G with video support) may show video thumbnails in their UI.

**Investigation scope:**

1. **Which iPod models display video thumbnails/artwork?** Research whether Classic, Nano, or other generations show thumbnails in the video menu. This determines whether video artwork matters for any current user.

2. **How does libgpod handle video artwork?** Does `setArtworkFromData()` work for video tracks? Is there a separate mechanism? Do we need to extract frames or use embedded artwork?

3. **transferMode implications for video:** If video artwork exists, should `transferMode` control whether embedded thumbnails are stripped/preserved, analogous to music? The behavior matrix from DOC-012 would need a video section.

4. **Doctor command:** If video artwork is supported, the doctor's artwork database operations need to cover video tracks too — checking for missing/orphaned video artwork.

5. **DeviceCapabilities:** The `supportsVideo` capability exists but doesn't capture whether the device shows video thumbnails. We may need a `supportsVideoArtwork` or similar capability.

6. **Video transcode args:** The current video transcoding in `ffmpeg.ts` may already handle thumbnails in some way — investigate what the current args do with video artwork/thumbnail streams.

This is an investigation task. Output should be findings and recommendations, potentially spawning implementation tasks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Research documented: which iPod models display video thumbnails/artwork in menus
- [ ] #2 Research documented: how libgpod handles video artwork (API, format, limitations)
- [ ] #3 Recommendation on whether transferMode should apply to video operations
- [ ] #4 Doctor command video artwork implications identified
- [ ] #5 DeviceCapabilities extensions needed for video artwork identified
- [ ] #6 Current video transcode FFmpeg args reviewed for thumbnail/artwork handling
<!-- AC:END -->
