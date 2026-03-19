import { describe, it, expect } from 'bun:test';
import { migration0001 } from './0001-add-version.js';
import { createTestContext } from './test-utils.js';

const ctx = createTestContext();

describe('migration 0001: add version field', () => {
  it('adds version = 1 after leading comments', async () => {
    const input = `# podkit config
# more comments

quality = "high"
`;
    const result = await migration0001.migrate(input, ctx);

    expect(result).toContain('version = 1');
    // Version should come after comments but before content
    const lines = result.split('\n');
    const versionIdx = lines.findIndex((l) => l === 'version = 1');
    const qualityIdx = lines.findIndex((l) => l === 'quality = "high"');
    expect(versionIdx).toBeLessThan(qualityIdx);
    // Comments should still be before version
    expect(lines[0]).toBe('# podkit config');
  });

  it('adds version = 1 to empty config', async () => {
    const result = await migration0001.migrate('', ctx);
    expect(result).toContain('version = 1');
  });

  it('adds version = 1 to config with only content (no comments)', async () => {
    const input = `quality = "high"
artwork = true
`;
    const result = await migration0001.migrate(input, ctx);

    expect(result).toContain('version = 1');
    // Version should be first non-empty line
    const lines = result.split('\n');
    expect(lines[0]).toBe('version = 1');
    // Original content preserved
    expect(result).toContain('quality = "high"');
    expect(result).toContain('artwork = true');
  });

  it('preserves existing content completely', async () => {
    const input = `# podkit config

[music.main]
path = "/music"

[devices.ipod]
volumeUuid = "ABC-123"
quality = "high"
`;
    const result = await migration0001.migrate(input, ctx);

    expect(result).toContain('version = 1');
    expect(result).toContain('[music.main]');
    expect(result).toContain('path = "/music"');
    expect(result).toContain('[devices.ipod]');
    expect(result).toContain('volumeUuid = "ABC-123"');
    expect(result).toContain('quality = "high"');
  });

  it('is a no-op when version field already exists', async () => {
    const input = `version = 1
quality = "high"
`;
    const result = await migration0001.migrate(input, ctx);
    expect(result).toBe(input);
  });

  it('does not duplicate version field on re-run', async () => {
    const input = `quality = "high"`;
    const first = await migration0001.migrate(input, ctx);
    const second = await migration0001.migrate(first, ctx);

    // Count occurrences of "version = 1"
    const matches = second.match(/version = 1/g);
    expect(matches?.length).toBe(1);
  });

  it('handles config with only comments', async () => {
    const input = `# comment 1
# comment 2
`;
    const result = await migration0001.migrate(input, ctx);

    expect(result).toContain('version = 1');
    expect(result).toContain('# comment 1');
    expect(result).toContain('# comment 2');
  });

  it('inserts version after blank lines between comments and content', async () => {
    const input = `# header

# another comment

quality = "high"
`;
    const result = await migration0001.migrate(input, ctx);

    // Version should be inserted right before "quality"
    const lines = result.split('\n');
    const versionIdx = lines.findIndex((l) => l === 'version = 1');
    const qualityIdx = lines.findIndex((l) => l === 'quality = "high"');
    expect(versionIdx).toBeLessThan(qualityIdx);
  });

  it('has correct metadata', () => {
    expect(migration0001.fromVersion).toBe(0);
    expect(migration0001.toVersion).toBe(1);
    expect(migration0001.type).toBe('automatic');
    expect(migration0001.description).toBeTruthy();
  });
});
