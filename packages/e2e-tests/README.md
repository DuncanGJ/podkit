# @podkit/e2e-tests

End-to-end tests for the podkit CLI. Tests invoke the built CLI artifact (`dist/main.js`) as a real user would, against both dummy iPods (CI) and real iPods (manual validation).

## Running Tests

### Prerequisites

1. Build the CLI and native bindings:
   ```bash
   bun run build
   bun run build:native  # Build libgpod-node native bindings
   ```

2. Ensure gpod-tool is available:
   ```bash
   mise run tools:build
   ```

3. Ensure FFmpeg is installed:
   ```bash
   brew install ffmpeg  # macOS
   ```

**Note:** Tests that require libgpod (status, list from iPod, sync) need the native bindings to be built and accessible. The `init` command tests work without native bindings.

### Run with Dummy iPod (Default)

```bash
# Run all E2E tests
bun run test:e2e

# Or from packages/e2e-tests
bun run test
```

### Run with Real iPod

1. Connect your iPod and mount it

2. Run pre-flight checks:
   ```bash
   cd packages/e2e-tests
   IPOD_MOUNT=/Volumes/YourIPod bun run preflight
   ```

3. Run tests:
   ```bash
   IPOD_MOUNT=/Volumes/YourIPod bun run test:e2e:real
   ```

## Test Structure

```
src/
├── targets/           # iPod target abstraction
│   ├── types.ts       # IpodTarget interface
│   ├── dummy.ts       # Uses @podkit/gpod-testing
│   ├── real.ts        # Uses IPOD_MOUNT env var
│   └── factory.ts     # Creates target based on IPOD_TARGET env
│
├── helpers/           # Test utilities
│   ├── cli-runner.ts  # Spawn CLI process, capture output
│   ├── fixtures.ts    # Path to test/fixtures/audio
│   └── preflight.ts   # Pre-flight checks for real iPod
│
├── commands/          # Per-command tests
│   ├── init.e2e.test.ts
│   ├── status.e2e.test.ts
│   ├── list.e2e.test.ts
│   └── sync.e2e.test.ts
│
└── workflows/         # Multi-step workflow tests
    ├── fresh-sync.e2e.test.ts
    └── incremental.e2e.test.ts
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IPOD_TARGET` | Target type: `dummy` or `real` | `dummy` |
| `IPOD_MOUNT` | Mount path for real iPod (required when `IPOD_TARGET=real`) | - |

## Target Abstraction

Tests use an `IpodTarget` interface that abstracts away whether we're testing against a dummy iPod (temp directory) or a real device:

```typescript
interface IpodTarget {
  readonly path: string;           // Mount point
  readonly name: string;           // Display name
  readonly isRealDevice: boolean;  // Affects cleanup behavior

  getTrackCount(): Promise<number>;
  getTracks(): Promise<TrackInfo[]>;
  verify(): Promise<VerifyResult>;
  cleanup(): Promise<void>;
}
```

### Using Targets in Tests

```typescript
import { withTarget } from '../targets';

it('syncs tracks', async () => {
  await withTarget(async (target) => {
    // target.path is the iPod mount point
    const result = await runCli(['sync', '--device', target.path, ...]);

    // Verify tracks were added
    const count = await target.getTrackCount();
    expect(count).toBe(3);
  });
  // Cleanup happens automatically
});
```

## CLI Runner

The CLI runner spawns the actual CLI binary as a subprocess:

```typescript
import { runCli, runCliJson } from '../helpers/cli-runner';

// Basic usage
const result = await runCli(['status', '--device', '/path']);
expect(result.exitCode).toBe(0);
expect(result.stdout).toContain('Tracks:');

// JSON output parsing
const { result, json } = await runCliJson<StatusOutput>([
  'status', '--device', '/path', '--json'
]);
expect(json?.connected).toBe(true);
```

## Pre-flight Checks

Before running real iPod tests, pre-flight checks verify:

1. CLI is built
2. gpod-tool is available
3. FFmpeg is available
4. Test fixtures exist
5. Mount point exists and is accessible
6. iPod_Control directory exists
7. iTunesDB is readable
8. Sufficient free space (50MB minimum)
9. Write permissions

```bash
cd packages/e2e-tests
bun run preflight                           # Check basic requirements
IPOD_MOUNT=/Volumes/iPod bun run preflight  # Include real iPod checks
```

## Test Coverage

### Per-Command Tests

| Command | Tests |
|---------|-------|
| `init` | Config creation, `--force` overwrite, error handling |
| `status` | Device info, JSON output, error handling |
| `list` | Table/JSON/CSV formats, field selection, from iPod vs source |
| `sync` | Dry-run, actual sync, quality presets, errors |

### Workflow Tests

| Workflow | Description |
|----------|-------------|
| Fresh sync | Empty iPod → init → sync → status → list |
| Incremental | Sync subset → sync full → verify only new tracks added |

## Safety Notes

### Real iPod Testing

- Tests **never auto-delete** user data on real devices
- `cleanup()` is a no-op for `RealIpodTarget`
- Always run pre-flight checks before testing with real hardware
- Consider using an old/test iPod rather than your main device

### Dummy iPod Testing

- Uses `@podkit/gpod-testing` to create temporary iPod directories
- Automatically cleaned up after each test
- Safe to run in CI environments
