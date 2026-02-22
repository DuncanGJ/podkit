---
id: TASK-028
title: Write getting-started-llms agent guide
status: To Do
assignee: []
created_date: '2026-02-22 19:38'
labels: []
milestone: 'M3: Production Ready (v1.0.0)'
dependencies:
  - TASK-027
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Write a guide designed for AI agents to help users through the setup and sync process.

**Purpose:** An LLM agent can read this guide and interactively help a user set up and use podkit.

**Content:**
1. Context: What podkit is, who it's for
2. Qualifying questions for agent to ask:
   - Do you have a music library? What format?
   - Do you have a compatible iPod? Which model?
3. Step-by-step process with checkpoints:
   - Verify prerequisites
   - Install dependencies (offer to run commands)
   - Install podkit
   - Test installation (`podkit --version`)
   - Connect iPod, verify detection (`podkit status`)
   - Dry run (`podkit sync --dry-run`)
   - Full sync
4. Each step: what to check, how to validate, common errors

**Interaction style:** Agent should:
- Ask before running commands
- Validate each step before proceeding
- Explain what's happening
- Handle errors helpfully

**Location:** docs/GETTING-STARTED-LLMS.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Guide enables LLM to help user end-to-end
- [ ] #2 Includes qualifying questions
- [ ] #3 Step-by-step with validation checkpoints
- [ ] #4 Covers common errors and recovery
- [ ] #5 Tested with actual LLM agent
<!-- AC:END -->
