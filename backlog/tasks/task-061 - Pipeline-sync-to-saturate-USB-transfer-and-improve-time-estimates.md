---
id: TASK-061
title: Pipeline sync to saturate USB transfer and improve time estimates
status: To Do
assignee: []
created_date: '2026-02-26 14:21'
labels:
  - performance
  - sync
  - core
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

Current sync processes tracks sequentially: transcode → copy → transcode → copy. This leaves the USB bus idle during transcoding, wasting time.

First E2E test showed estimates are wildly inaccurate:
- **Estimated:** 8h 32m
- **Actual:** 58m 49s (9x faster)

## Observation

For a 1,414 track sync (9.3 GB):
- Actual throughput: ~2.7 MB/s
- USB 2.0 max: ~15-20 MB/s real-world

USB transfer is likely the bottleneck, not transcoding. Modern CPUs transcode faster than USB 2.0 can transfer.

## Proposed Improvement

### 1. Pipeline Architecture

```
[Transcode Queue] → [Transfer Queue] → [iPod]

Time 0:  Transcode A
Time 1:  Transcode B,  Transfer A
Time 2:  Transcode C,  Transfer B
Time 3:  Transcode D,  Transfer C
...
```

While file N transfers to iPod, transcode file N+1 (or N+2, N+3 with small buffer).

### 2. Implementation Approach

```typescript
interface PipelineExecutor {
  // Transcode worker produces files
  transcodeQueue: AsyncQueue<TranscodedFile>;
  
  // Transfer worker consumes and copies to iPod
  transferWorker: Promise<void>;
}

// Pseudo-code
async function pipelineSync(operations) {
  const transcodeQueue = new AsyncQueue(bufferSize: 2-3);
  
  // Producer: transcode files
  const transcoder = async () => {
    for (const op of transcodeOperations) {
      const result = await transcode(op);
      await transcodeQueue.push(result); // blocks if buffer full
    }
    transcodeQueue.close();
  };
  
  // Consumer: transfer to iPod
  const transferer = async () => {
    for await (const file of transcodeQueue) {
      await copyToIpod(file);
      cleanup(file);
    }
  };
  
  await Promise.all([transcoder(), transferer()]);
}
```

### 3. Improved Time Estimates

Base estimate on USB transfer speed, not transcoding:

```typescript
function estimateSyncTime(totalBytes: number): number {
  // Conservative USB 2.0 estimate
  const usbSpeedBytesPerSec = 2.5 * 1024 * 1024; // ~2.5 MB/s observed
  
  return totalBytes / usbSpeedBytesPerSec;
}
```

Optionally: measure actual transfer speed during first few files and adjust estimate dynamically.

## Benefits

1. **Faster syncs** — USB bus always busy
2. **Accurate estimates** — based on actual bottleneck
3. **Better UX** — users can trust the time estimate

## Considerations

- Buffer size: 2-3 files is enough (don't fill temp disk)
- Memory: stream transcoded files, don't hold all in memory
- Error handling: if transfer fails, don't lose transcoded files
- Progress reporting: track both queues for accurate progress
- Copy operations: these skip transcode queue, go straight to transfer

## Metrics from First Sync

- 1,414 tracks, 9.3 GB
- 58m 49s actual = 3529 seconds
- 2.7 MB/s effective throughput
- Estimate was 8h 32m = 30720 seconds (8.7x too high)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Transcoding and USB transfer happen in parallel (pipeline)
- [ ] #2 USB bus is continuously utilized during sync
- [ ] #3 Time estimate based on transfer speed, not transcode time
- [ ] #4 Estimate accuracy within 2x of actual time
- [ ] #5 Progress reporting reflects pipeline state
- [ ] #6 No regression in sync reliability
<!-- AC:END -->
