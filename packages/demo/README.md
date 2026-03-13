# @podkit/demo

Produces an animated GIF showcasing a typical podkit workflow. Uses [VHS](https://github.com/charmbracelet/vhs) to record a scripted terminal session.

## How it works

The demo builds a **standalone CLI binary** with mocked dependencies so it runs without a real iPod, FFmpeg, or music files. Two modules are swapped at build time via Bun build plugins:

| Real module | Mock | Purpose |
|---|---|---|
| `@podkit/core` | `src/mock-core.ts` | Canned device info, track listings, sync progress |
| `packages/podkit-cli/src/utils/fs.ts` | `src/mock-fs.ts` | All path/stat checks pass |

The mock core uses file-based state (`/tmp/podkit-demo/state.json`) to track what has been synced, so commands like `podkit device music` return different results before and after `podkit sync`.

## Files

| File | Purpose |
|---|---|
| `build.ts` | Bun build script with module-swapping plugins |
| `demo.tape` | VHS tape file — the scripted terminal session |
| `run.sh` | Thin launcher: exports binary path, invokes VHS |
| `src/mock-core.ts` | Mock `@podkit/core` with canned demo data |
| `src/mock-fs.ts` | Mock filesystem validation (always passes) |
| `src/demo-data.ts` | Canned tracks, videos, and device info |
| `src/state.ts` | Cross-invocation state for the demo binary |

## Usage

```bash
# Build the demo binary and record the GIF (from repo root)
bun run demo

# Or step by step:
bun run --filter=@podkit/demo build    # Build the demo binary
bun run --filter=@podkit/demo record   # Record with VHS
```

**Requires:** [VHS](https://github.com/charmbracelet/vhs) (`brew install vhs`)

Output: `packages/demo/demo.gif`

## Keeping the demo working

The demo binary compiles `packages/podkit-cli/src/main.ts` directly, with `@podkit/core` and `utils/fs.ts` replaced by mocks. This means:

- **CLI changes** (new commands, changed flags, altered output) may require updating the mock and/or the tape.
- **Core API changes** (new exports, changed types) require updating `src/mock-core.ts` to match.
- **New `node:fs` usage in CLI commands** should go through `packages/podkit-cli/src/utils/fs.ts` so the mock can intercept it.

Run `bun run demo` after making CLI or core changes to verify the demo still builds and records correctly.
