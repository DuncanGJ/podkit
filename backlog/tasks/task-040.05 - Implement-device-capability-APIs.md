---
id: TASK-040.05
title: Implement device capability APIs
status: To Do
assignee: []
created_date: '2026-02-23 22:38'
labels:
  - libgpod-node
  - device
dependencies: []
parent_task_id: TASK-040
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose libgpod device capability checking APIs:

- `itdb_device_supports_artwork(device)` - Check artwork support
- `itdb_device_supports_video(device)` - Check video support  
- `itdb_device_supports_photo(device)` - Check photo support
- `itdb_device_supports_podcast(device)` - Check podcast support
- `itdb_device_read_sysinfo(device)` - Read SysInfo file
- `itdb_device_write_sysinfo(device)` - Write SysInfo file

Note: Some capability info is already exposed via DeviceInfo, but explicit boolean checks would be cleaner.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Device capability checks available as methods or properties
- [ ] #2 SysInfo read/write operations exposed
- [ ] #3 Integration tests verify capability detection
<!-- AC:END -->
