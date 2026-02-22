# Testing Strategy

This document describes the testing approach for podkit.

## Overview

- **Framework:** Bun test runner
- **Organization:** Co-located tests (`*.test.ts` alongside source files)
- **Categories:** Unit tests and integration tests, distinguished by file suffix

## Test Categories

### Unit Tests (`*.test.ts`)

Fast tests with no external dependencies. These test individual functions, classes, and modules in isolation.

**Characteristics:**
- No external tools required (no FFmpeg, no gpod-tool)
- No filesystem side effects outside temp directories
- Fast execution (milliseconds per test)
- Can run anywhere without special setup

**Examples:**
- Testing pure functions
- Testing class methods with mocked dependencies
- Testing CLI command structure
- Testing data transformations

### Integration Tests (`*.integration.test.ts`)

Tests that verify components work together with real external dependencies.

**Characteristics:**
- May require external tools (gpod-tool, FFmpeg)
- May create real files/databases in temp directories
- Slower execution
- May require setup steps before running

**Examples:**
- Testing gpod-tool wrapper functions with real iTunesDB
- Testing FFmpeg transcoding with real audio files
- Testing full sync workflows

## Running Tests

```bash
# Run all tests (unit + integration)
bun run test

# Run only unit tests
bun run test:unit

# Run only integration tests
bun run test:integration

# Run tests for a specific package
bun test packages/podkit-core

# Run a specific test file
bun test packages/podkit-core/src/adapter.test.ts
```

All commands work with turborepo for caching and parallel execution across packages.

## Conditional Skipping

When external dependencies aren't available, tests should skip gracefully rather than fail. Bun reports skipped tests in the output.

### Using `describe.skipIf`

```typescript
import { describe, it, expect } from 'bun:test';
import { isGpodToolAvailable } from '@podkit/gpod-testing';

const gpodAvailable = await isGpodToolAvailable();

describe.skipIf(!gpodAvailable)('iPod database operations', () => {
  it('creates a track', async () => {
    // Test that requires gpod-tool
  });
});
```

### Using `beforeAll` to fail fast

For integration test files where all tests require a dependency:

```typescript
import { describe, it, beforeAll } from 'bun:test';
import { isGpodToolAvailable } from '@podkit/gpod-testing';

describe('gpod-testing integration', () => {
  beforeAll(async () => {
    if (!(await isGpodToolAvailable())) {
      throw new Error('gpod-tool not found. Run `mise run tools:build` first.');
    }
  });

  it('does something with iPod', async () => {
    // ...
  });
});
```

## Testing with iPod Databases

Use `@podkit/gpod-testing` to create test iPod environments. No physical hardware needed.

```typescript
import { withTestIpod } from '@podkit/gpod-testing';

it('adds a track to iPod', async () => {
  await withTestIpod(async (ipod) => {
    await ipod.addTrack({ title: 'Test', artist: 'Artist' });

    const tracks = await ipod.tracks();
    expect(tracks).toHaveLength(1);
  });
  // Cleanup is automatic
});
```

See [packages/gpod-testing/README.md](../packages/gpod-testing/README.md) for full API documentation.

## Writing Good Tests

### Test Coverage Philosophy

No hard coverage targets, but high coverage is expected:

- If a simple test can be written, write it
- Test all public API surfaces
- Test error handling and edge cases
- Integration tests for key user workflows

### Test Structure

Use the Arrange-Act-Assert pattern:

```typescript
it('parses track metadata from file', async () => {
  // Arrange
  const testFile = await createTestAudioFile({ title: 'Test Song' });

  // Act
  const metadata = await parseMetadata(testFile);

  // Assert
  expect(metadata.title).toBe('Test Song');
});
```

### Naming Conventions

- Describe blocks: noun phrases (`'DirectoryAdapter'`, `'sync command'`)
- Test names: should read as sentences (`'parses FLAC metadata'`, `'skips hidden files'`)

### File Organization

```
src/
├── adapter.ts
├── adapter.test.ts              # Unit tests for adapter
├── adapter.integration.test.ts  # Integration tests (if needed)
├── sync/
│   ├── planner.ts
│   ├── planner.test.ts
│   └── executor.integration.test.ts
```

## Prerequisites for Integration Tests

Before running integration tests, ensure dependencies are built:

```bash
# Build gpod-tool (required for iPod database tests)
mise run tools:build
mise trust  # First time only

# FFmpeg with libfdk_aac (required for transcoding tests)
# See docs/TRANSCODING.md for installation
```

## CI Considerations

Integration tests may be skipped in CI if dependencies aren't available. The test output will show skipped tests clearly.

For full integration test coverage in CI, ensure:
- gpod-tool is built as part of CI setup
- FFmpeg with libfdk_aac is available (or tests skip gracefully)
