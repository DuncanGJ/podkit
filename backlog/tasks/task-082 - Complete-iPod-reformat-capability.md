---
id: TASK-082
title: Complete iPod reformat capability
status: To Do
assignee: []
created_date: '2026-03-09 22:17'
updated_date: '2026-03-09 22:20'
labels:
  - cli
  - ipod
  - future
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the ability to completely reformat an iPod from scratch, including filesystem formatting.

## Use Case

User wants to take any iPod (possibly used with iTunes, corrupted, or with wrong filesystem) and set it up completely fresh for use with podkit.

## Scope

- Format iPod to Windows-compatible filesystem (FAT32/exFAT)
- Create iPod folder structure (iPod_Control, etc.)
- Initialize iTunesDB
- Handle SysInfo and other device-specific files

## Considerations

- This is a destructive operation - needs strong confirmation
- May require elevated privileges (sudo)
- Need to detect iPod model to create appropriate structure
- Should work on both macOS and Linux
- Consider whether to support HFS+ formatting as well
- Research this topic before making decisions
- Check if libgpod has documentation on this
<!-- SECTION:DESCRIPTION:END -->
