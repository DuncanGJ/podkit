import { describe, it, expect } from 'bun:test';
import { readConfigVersion, checkConfigVersion, CURRENT_CONFIG_VERSION } from './version.js';

describe('readConfigVersion', () => {
  it('returns the version when present and valid', () => {
    expect(readConfigVersion('version = 1')).toBe(1);
    expect(readConfigVersion('version = 5')).toBe(5);
    expect(readConfigVersion('version = 42')).toBe(42);
  });

  it('returns 0 when version field is missing', () => {
    expect(readConfigVersion('')).toBe(0);
    expect(readConfigVersion('quality = "high"')).toBe(0);
    expect(readConfigVersion('# just a comment')).toBe(0);
  });

  it('reads version among other config fields', () => {
    const toml = `
# podkit config
version = 3
quality = "high"

[music.main]
path = "/music"
`;
    expect(readConfigVersion(toml)).toBe(3);
  });

  it('throws on string version', () => {
    expect(() => readConfigVersion('version = "1"')).toThrow('Invalid config version');
  });

  it('throws on negative version', () => {
    expect(() => readConfigVersion('version = -1')).toThrow('Invalid config version');
  });

  it('throws on zero version', () => {
    expect(() => readConfigVersion('version = 0')).toThrow('Invalid config version');
  });

  it('throws on float version', () => {
    expect(() => readConfigVersion('version = 1.5')).toThrow('Invalid config version');
  });

  it('throws on boolean version', () => {
    expect(() => readConfigVersion('version = true')).toThrow('Invalid config version');
  });
});

describe('checkConfigVersion', () => {
  it('returns error message when version is 0 (pre-versioning)', () => {
    const result = checkConfigVersion(0);
    expect(result).not.toBeNull();
    expect(result).toContain('version 0');
    expect(result).toContain(`version ${CURRENT_CONFIG_VERSION}`);
  });

  it('returns null when version equals CURRENT_CONFIG_VERSION', () => {
    expect(checkConfigVersion(CURRENT_CONFIG_VERSION)).toBeNull();
  });

  it('returns null when version is above CURRENT_CONFIG_VERSION', () => {
    expect(checkConfigVersion(CURRENT_CONFIG_VERSION + 1)).toBeNull();
    expect(checkConfigVersion(CURRENT_CONFIG_VERSION + 100)).toBeNull();
  });

  it('error message mentions podkit migrate', () => {
    const result = checkConfigVersion(0);
    expect(result).toContain('podkit migrate');
  });
});
