# Config Migrations

Guidance for creating and maintaining config migrations. See [AGENTS.md](../AGENTS.md) for project overview.

podkit uses a versioned config system with a migration engine. The config file has a `version` field (positive integer). Configs without a version field are version 0 (pre-versioning era).

## When a Migration is Needed

**Required** for:
- Breaking config restructures (renaming/removing sections)
- Breaking field changes (type changes, renames, removals)
- New required fields that must have a value

**Not required** for:
- New optional fields with defaults (existing configs work without them)
- Internal-only changes that don't affect the config file
- Documentation-only changes

## How Config Versions Work

- `CURRENT_CONFIG_VERSION` in `packages/podkit-cli/src/config/version.ts` is the latest version
- Running any command with an outdated config → hard error pointing to `podkit migrate`
- `podkit migrate` detects the version, shows pending migrations, runs them sequentially, backs up the original, and writes the updated config
- Migrations work with raw TOML strings (not typed config objects) so they can handle incompatible structures

## How to Create a Migration

1. Increment `CURRENT_CONFIG_VERSION` in `packages/podkit-cli/src/config/version.ts`
2. Create a new migration file: `packages/podkit-cli/src/config/migrations/NNNN-description.ts`
3. Implement the `Migration` interface (see `packages/podkit-cli/src/config/migrations/types.ts`)
4. Register it in `packages/podkit-cli/src/config/migrations/registry.ts`
5. Add tests in a corresponding `.test.ts` file
6. See example migrations in `packages/podkit-cli/src/config/migrations/examples/` for templates covering 6 common scenarios

## Migration Types

- **Automatic** (`type: 'automatic'`): Deterministic transformations, no user input needed
- **Interactive** (`type: 'interactive'`): Uses `context.prompt` to ask user for decisions. User can abort at any point — aborting leaves the config unchanged.

## Key Files

| Purpose | Path |
|---------|------|
| Version constant | `packages/podkit-cli/src/config/version.ts` |
| Migration types | `packages/podkit-cli/src/config/migrations/types.ts` |
| Migration engine | `packages/podkit-cli/src/config/migrations/engine.ts` |
| Migration registry | `packages/podkit-cli/src/config/migrations/registry.ts` |
| Migrate command | `packages/podkit-cli/src/commands/migrate.ts` |
| Example migrations | `packages/podkit-cli/src/config/migrations/examples/` |
| Test utilities | `packages/podkit-cli/src/config/migrations/test-utils.ts` |

See [docs/developers/config-migrations.md](../docs/developers/config-migrations.md) for the full developer guide.
