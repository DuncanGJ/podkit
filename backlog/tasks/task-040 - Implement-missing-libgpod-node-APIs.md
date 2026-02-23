---
id: TASK-040
title: Implement missing libgpod-node APIs
status: To Do
assignee: []
created_date: '2026-02-23 22:37'
labels:
  - libgpod-node
  - native-bindings
  - epic
dependencies: []
references:
  - docs/LIBGPOD.md
  - packages/libgpod-node/native/gpod_binding.cc
  - packages/libgpod-node/src/binding.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose additional libgpod C APIs through the Node.js bindings. The current implementation covers core database, track, and basic playlist read operations, but many useful APIs remain unwrapped.

This is a parent task tracking the implementation of missing APIs across several categories.
<!-- SECTION:DESCRIPTION:END -->
