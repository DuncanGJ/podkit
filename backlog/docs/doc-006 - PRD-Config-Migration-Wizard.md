---
id: doc-006
title: 'PRD: Config Migration Wizard'
type: other
created_date: '2026-03-19 13:33'
---
## Problem Statement

podkit's TOML config format will evolve over time as features are added and the CLI surface matures. Currently there is no mechanism to detect outdated configs, communicate breaking changes to users, or help them migrate. When a breaking config change ships (e.g., renaming sections, restructuring fields), users hit opaque parse errors with no guidance on what changed or how to fix it. As podkit approaches v1 and the config surface grows, this becomes increasingly painful.

Users need a system that:
- Tells them clearly when their config is outdated
- Distinguishes between breaking changes (hard error) and new optional features (info tip)
- Provides an interactive, context-aware wizard to migrate their config rather than requiring manual TOML editing

## Solution

A versioned config system with a `podkit migrate` command that detects the current config version, identifies applicable migrations, and walks the user through an interactive wizard to update their config file.

**How it works from the user's perspective:**

1. User upgrades podkit. Their config file is now outdated.
2. They run any podkit command (e.g., `podkit sync`).
3. If the config has breaking incompatibilities: hard error explaining what changed, with a message to run `podkit migrate`.
4. If the config is functional but missing new optional features: info tip suggesting they run `podkit migrate` to configure new options.
5. User runs `podkit migrate`. The wizard detects their config version, explains what's changing, and walks them through decisions step by step.
6. The wizard backs up the original config, applies migrations, writes the updated config with the new version number.

**Config version field:**

```toml
version = 1

[music.default]
path = "/media/music"
```

Configs without a `version` field are treated as version 0 (pre-versioning era).

## User Stories

1. As a podkit user who just upgraded, I want to be told clearly that my config needs updating, so that I don't waste time debugging cryptic parse errors.
2. As a podkit user, I want to run a single command (`podkit migrate`) to update my config, so that I don't have to manually edit TOML.
3. As a podkit user with a breaking config change, I want to see a hard error (not a warning) when running any command, so that I don't accidentally sync with a misinterpreted config.
4. As a podkit user, I want the migration wizard to ask me questions about my setup when a migration needs decisions (e.g., "this directory has both TV shows and movies — how should we configure it?"), so that the migration is accurate to my intent.
5. As a podkit user, I want my original config backed up before migration, so that I can recover if something goes wrong.
6. As a podkit user, I want to see what migrations will be applied before they run, so that I understand what's changing.
7. As a podkit user with new optional features available, I want to see an info tip (not an error) suggesting I run `podkit migrate`, so that I learn about new options without being blocked.
8. As a podkit user, I want the wizard to show me a diff or summary of changes before writing, so that I can confirm the migration looks correct.
9. As a podkit user with multiple config sources (file + env vars), I want the migration to clearly scope to the config file only, so that I understand what's being changed.
10. As a podkit user running `podkit migrate` when my config is already current, I want to see a message saying "config is up to date", so that I know nothing needs to happen.
11. As a podkit developer, I want to add new migrations by implementing a simple interface with detection logic and a migration function, so that future config changes are easy to ship.
12. As a podkit developer, I want migrations to run in order (version 0→1, then 1→2, etc.), so that the system is predictable and composable.
13. As a podkit user with Docker, I want config version detection to work with environment variable-only configs, so that Docker users get clear messaging about breaking env var changes too.
14. As a podkit user, I want the migration wizard to be context-aware (e.g., scanning my directories to detect content types), so that it makes intelligent suggestions rather than asking me to guess.
15. As a podkit user, I want to be able to abort the migration at any point without my config being modified, so that I feel safe running it.

## Implementation Decisions

### Config Versioning
- The config file gains an optional `version` field (positive integer, starting at 1).
- Configs without a `version` field are version 0.
- The version is checked early in config loading, before full parsing/validation.
- Version checking is a lightweight TOML read (not full config load) so it works even when the config structure has changed incompatibly.

### Migration Registry
- Migrations are defined as an ordered list, each with: source version, target version, a human-readable description, a detection function (is this migration applicable?), and a migration function.
- Migrations are cumulative — running `podkit migrate` on a version 0 config applies 0→1, then 1→2, etc.
- Each migration declares whether it is automatic (deterministic, no user input needed) or interactive (requires wizard prompts).

### Outdated Config Detection
- Hooked into config loading, before parsing.
- Two severity levels:
  - **Breaking**: Config version is behind and the current parser can't handle it. Hard error, command exits with a message to run `podkit migrate`.
  - **Advisory**: Config version is current but new optional features exist that the user hasn't configured. Info tip (respects `tips` setting).
- Detection uses a lightweight version check (reads just the `version` field from TOML) so it works even when the rest of the config is structurally incompatible.

### Migration Engine
- Reads the raw TOML file (not the parsed config — the structure may be incompatible with current types).
- Runs applicable migrations in order.
- Each migration receives the raw TOML content and returns updated TOML content.
- Interactive migrations can prompt the user for decisions.
- Before writing, shows a summary of changes and asks for confirmation.
- Backs up the original file (e.g., `config.toml.backup`) before writing.
- Writes the updated config with the new version number.

### `podkit migrate` Command
- Entry point for the migration wizard.
- Detects config file location (same resolution as normal config loading).
- Shows current version, target version, and list of migrations to apply.
- Runs migrations sequentially, prompting for interactive decisions.
- Shows a summary/diff before writing.
- Supports `--dry-run` to preview changes without writing.
- Exits cleanly if config is already up to date.

### Context-Aware Migration Steps
- Individual migration implementations are free to use podkit's existing infrastructure (e.g., directory scanning, content type detection) to make intelligent suggestions.
- The migration function interface receives a context object with utilities for prompting the user, scanning directories, and reading the filesystem.
- This allows migrations like "scan your video directory and suggest tv/movies split" to reuse the existing `VideoDirectoryAdapter` content type detection.

### Scope Boundaries
- Migrations only modify the config file. Environment variables and CLI flags are not migrated.
- If a user relies on env vars that map to removed config sections, the version detection messaging should explain this.
- Per-device config sections are migrated alongside global sections (same file, same pass).

## Testing Decisions

Good tests for this system verify external behavior: given an input config file at version N, does the migration engine produce the correct output at version M? Tests should not depend on internal implementation details of individual migrations.

### Modules to test:
- **Config version detection**: Given various TOML files (with version, without version, with invalid version), does detection return the correct version number and severity level?
- **Migration engine**: Given a version 0 config and a set of migrations, does the engine apply them in order and produce the correct output? Does it handle dry-run correctly? Does it back up the original?
- **Individual migrations**: Each migration should have its own tests — given specific input TOML, does it produce the expected output TOML? For interactive migrations, test with mocked prompts.
- **Outdated config detection in config loader**: Does config loading correctly error on breaking version mismatches and show tips for advisory ones?

### Prior art:
- Config parsing tests in the existing config loader test suite (unit tests for TOML parsing and validation).
- The existing pattern of testing config edge cases (missing fields, invalid values, etc.) applies directly to version detection.

## Out of Scope

- **Automatic migration on command run**: The migration is always explicit via `podkit migrate`. Commands that detect outdated configs error or tip, but never auto-migrate.
- **Downgrade migrations**: Migrations are forward-only. There is no `podkit migrate --to-version 0`.
- **Multi-file config migration**: Only the primary config file is migrated. If a user has split configs or includes, those are not handled.
- **Environment variable migration**: Env var naming changes are communicated via error messages, not automated migration.
- **GUI/TUI migration interface**: The wizard uses standard CLI prompts (stdin/stdout), not a full TUI framework.

## Further Notes

- The first migration (version 0→1) will be the `[video.*]` → `[tv.*]` + `[movies.*]` split, implemented as part of the Video Collection Split PRD. That PRD depends on this one being completed first.
- The version number should be written as the first field in the config file for visibility.
- Consider whether `podkit init` (config generation) should also be updated to generate versioned configs — it should.
- The backup file naming could use timestamps (e.g., `config.toml.backup.2026-03-19`) to avoid overwriting previous backups.
- Docker's `init` command (which generates configs into /config) should generate versioned configs. Docker users who mount a config file will see the same version detection and error messaging.
