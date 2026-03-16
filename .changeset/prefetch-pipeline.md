---
"@podkit/core": patch
---

Improve sync throughput for remote sources (Subsonic) by pipelining file downloads ahead of transcoding. Previously, each track was downloaded and then transcoded sequentially, leaving the network idle during CPU work. The executor now uses a three-stage pipeline (download → transcode → transfer) so network I/O overlaps with FFmpeg encoding. Local directory sources are unaffected.
