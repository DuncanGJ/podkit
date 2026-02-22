# ADR-005: iPod Test Environment

## Status

**Accepted** (2026-02-22)

## Context

podkit requires testing libgpod operations (database parsing, track management, artwork handling) without physical iPod hardware. Tests must run in CI environments (GitHub Actions, etc.) without special permissions, device access, or complex setup.

The testing strategy affects multiple packages:
- **libgpod-node**: Native binding tests
- **podkit-core**: Sync engine integration tests
- **podkit-cli**: End-to-end command tests

## Decision Drivers

- CI-friendly (no root, no devices, no loopback mounts)
- Fast test setup/teardown
- Cross-platform (Linux, macOS, Windows)
- Full libgpod API coverage
- Useful for both automated tests and manual development

## Options Considered

### Option A: Loopback Disk Image

Create a FAT32 disk image, mount via loopback, initialize iPod structure.

```bash
dd if=/dev/zero of=ipod.img bs=1M count=100
mkfs.vfat ipod.img
sudo mount -o loop ipod.img /tmp/test-ipod
```

**Pros:**
- Most realistic filesystem behavior
- Tests FAT32 edge cases

**Cons:**
- Requires root/sudo for mounting
- Platform-specific mount commands
- Slow setup/teardown
- Cannot run in most CI environments

### Option B: Manual Directory Structure

Create the iPod directory structure and files manually.

```bash
mkdir -p /tmp/test-ipod/iPod_Control/{Device,iTunes,Music}
echo "ModelNumStr: MA147" > /tmp/test-ipod/iPod_Control/Device/SysInfo
# Manually create iTunesDB binary...
```

**Pros:**
- No root required
- Full control over structure

**Cons:**
- Fragile: must track libgpod's expectations
- iTunesDB is binary format, hard to create manually
- No ArtworkDB generation

### Option C: libgpod's itdb_init_ipod()

Use libgpod's built-in initialization function to create a complete iPod structure.

```c
gboolean itdb_init_ipod(
    const gchar *mountpoint,   // Any directory path
    const gchar *model_number, // e.g., "MA147"
    const gchar *ipod_name,    // Display name
    GError **error
);
```

**Pros:**
- Creates complete, valid structure
- No root or special permissions
- Fast (~10ms)
- Cross-platform
- Includes iTunesDB, ArtworkDB, all directories
- Model-appropriate directory counts

**Cons:**
- Requires libgpod to be installed
- Tests depend on libgpod correctness

### Option D: Pre-generated Test Fixtures

Ship static test iPod structures in the repository.

**Pros:**
- No runtime generation
- Known, reproducible state

**Cons:**
- Large binary files in repo
- Hard to update
- Limited flexibility (can't test different models)

## Decision

**Option C: Use libgpod's `itdb_init_ipod()` function**

This provides the best balance of correctness, speed, and CI compatibility.

### Proof of Concept Results

Verified on macOS (arm64):

```
$ ./test-init-ipod
Initializing iPod at /tmp/test-ipod with model MA147...
iPod initialized successfully!
Parsing database...
Database parsed successfully!
Tracks: 0
Playlists: 1
Model: A147
```

Structure created:
```
/tmp/test-ipod/
├── iPod_Control/
│   ├── Artwork/ArtworkDB
│   ├── Device/SysInfo
│   ├── iTunes/iTunesDB
│   └── Music/F00-F49/
├── Calendars/
├── Contacts/
├── Notes/
└── Photos/Thumbs/
```

All libgpod operations work: `itdb_parse()`, `itdb_track_add()`, `itdb_write()`.

## Implementation

### gpod-tool CLI

A standalone C utility (`tools/gpod-tool/`) wraps libgpod operations for both testing and development use. This approach:

- **Single source of truth**: One binary used by tests, developers, and CI
- **No N-API for testing**: Avoids native module complexity in test setup
- **Language-agnostic**: Any test framework can shell out to gpod-tool

#### Commands

```bash
# Create a test iPod structure
gpod-tool init <path> --model MA147 --name "Test iPod"

# Display database info
gpod-tool info <path>

# List all tracks
gpod-tool tracks <path>

# Add a track entry (metadata only)
gpod-tool add-track <path> --title "Song" --artist "Artist" --album "Album"

# Verify database integrity
gpod-tool verify <path>
```

All commands support `--json` for machine-readable output.

#### Use in Bun Tests

```typescript
import { $ } from 'bun';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

async function createTestIpod(model = 'MA147'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'test-ipod-'));
  await $`gpod-tool init ${dir} --model ${model}`;
  return dir;
}

describe('iPod sync', () => {
  let testIpod: string;

  beforeEach(async () => {
    testIpod = await createTestIpod();
  });

  afterEach(async () => {
    await rm(testIpod, { recursive: true });
  });

  it('reads empty database', async () => {
    const result = await $`gpod-tool info ${testIpod} --json`.json();
    expect(result.track_count).toBe(0);
    expect(result.playlist_count).toBe(1);
  });
});
```

#### Developer Use

```bash
# Create a persistent test iPod for development
gpod-tool init ~/dev-ipod --model MA147 --name "Dev iPod"

# Add test tracks
gpod-tool add-track ~/dev-ipod -t "Test Song 1" -a "Artist"
gpod-tool add-track ~/dev-ipod -t "Test Song 2" -a "Artist"

# Inspect
gpod-tool tracks ~/dev-ipod
gpod-tool info ~/dev-ipod --json

# Verify after modifications
gpod-tool verify ~/dev-ipod
```

### Model Numbers

| Model | Device | Artwork | Primary Use |
|-------|--------|---------|-------------|
| MA147 | iPod Video 60GB | RGB565 | Default, full-featured |
| MB565 | iPod Classic 120GB | JPEG | Different artwork format |
| MA477 | iPod Nano 2GB | RGB565 | Nano-specific tests |

## Consequences

### Positive

- Tests run anywhere without special setup
- Fast test execution (~10ms per test iPod)
- Full libgpod operation coverage
- Enables comprehensive CI testing
- Same approach works for dev tooling

### Negative

- Tests require libgpod installed
- Cannot test filesystem edge cases (permissions, FAT32 limits)
- Test database may drift from real device behavior

### Mitigations

- Document libgpod installation in DEVELOPMENT.md
- Add optional integration tests with real device (manual, not CI)
- Keep libgpod version pinned for reproducibility

## Related Decisions

- ADR-002: libgpod binding approach (N-API bindings expose `initIpod`)
- TASK-003: Testing strategy (will reference this ADR)
- TASK-007: Research that led to this decision

## References

- [libgpod Device API](https://tmz.fedorapeople.org/docs/libgpod/libgpod-Device.html)
- [libgpod iTunesDB API](https://tmz.fedorapeople.org/docs/libgpod/libgpod-The-Itdb-iTunesDB-structure.html)
- [gpod-utils](https://github.com/whatdoineed2do/gpod-utils) - CLI tools using libgpod
