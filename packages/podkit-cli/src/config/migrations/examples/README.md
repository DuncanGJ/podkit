---
title: Migration Examples
description: Reference implementations for common migration scenarios.
---

# Migration Examples

This directory contains reference implementations covering common migration scenarios.
These are **not registered** in the migration registry — they exist purely as templates
for developers to copy when writing real migrations.

## How to Use

1. Find the example closest to your scenario
2. Copy it to `packages/podkit-cli/src/config/migrations/`
3. Rename the file to `NNNN-description.ts` (e.g., `0002-rename-video-to-media.ts`)
4. Update `fromVersion` and `toVersion` to match your migration's position in the chain
5. Register it in `registry.ts`
6. Add tests (see `examples.test.ts` for patterns)

## Examples

| File | Scenario | Type |
|------|----------|------|
| `example-section-restructure.ts` | Renaming TOML section headers (e.g., `[video.*]` to `[media.*]`) | automatic |
| `example-field-rename.ts` | Renaming a field across multiple sections | automatic |
| `example-new-required-field.ts` | Adding a required field with a sensible default | automatic |
| `example-new-optional-feature.ts` | Informing users about a new opt-in feature | interactive |
| `example-deprecation.ts` | Replacing a deprecated field with its successor | automatic |
| `example-env-var-change.ts` | Notifying users about renamed environment variables | automatic |

## Migration Versions

Real migrations use sequential version numbers starting from 0 (see `0001-add-version.ts`
which migrates from version 0 to 1). These examples use versions in the 90s range
(90-96) to avoid conflicts with real migrations.

## Key Patterns

- **Raw TOML manipulation:** Migrations work with raw TOML strings, not parsed objects.
  This is because the config structure may have changed incompatibly between versions.
  Use regex and string operations for transformations, and `smol-toml` only for reading
  specific values when needed.

- **Automatic vs. interactive:** Automatic migrations run without user input — use them
  for deterministic transformations. Interactive migrations use `context.prompt.*` to
  ask the user for decisions — use them for changes where the right default isn't obvious.

- **Version bumping:** The migration engine handles updating the `version` field in the
  config. Your `migrate()` function should focus on the actual content transformation.
