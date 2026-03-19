import { describe, it, expect } from 'bun:test';
import { MigrationAbortError } from './types.js';
import { createTestContext } from './test-utils.js';

describe('MigrationAbortError', () => {
  it('has correct name and message', () => {
    const err = new MigrationAbortError();
    expect(err.name).toBe('MigrationAbortError');
    expect(err.message).toBe('Migration aborted by user');
  });

  it('accepts custom message', () => {
    const err = new MigrationAbortError('Custom abort reason');
    expect(err.message).toBe('Custom abort reason');
  });

  it('is an instance of Error', () => {
    const err = new MigrationAbortError();
    expect(err).toBeInstanceOf(Error);
  });
});

describe('createTestContext', () => {
  it('creates context with default mocks', () => {
    const ctx = createTestContext();
    expect(ctx.dryRun).toBe(false);
    expect(ctx.prompt).toBeDefined();
    expect(ctx.fs).toBeDefined();
  });

  it('allows overriding dryRun', () => {
    const ctx = createTestContext({ dryRun: true });
    expect(ctx.dryRun).toBe(true);
  });

  it('allows overriding prompt responses', async () => {
    const ctx = createTestContext({
      prompt: {
        confirm: async () => false,
        choose: async () => 'custom-value' as never,
        text: async () => 'custom-text',
      },
    });
    expect(await ctx.prompt.confirm('test')).toBe(false);
    expect(await ctx.prompt.choose('test', [{ value: 'a', label: 'A' }])).toBe('custom-value');
    expect(await ctx.prompt.text('test')).toBe('custom-text');
  });

  it('allows overriding filesystem', () => {
    const ctx = createTestContext({
      fs: {
        exists: () => false,
        readFile: () => 'file content',
        readdir: () => ['a.txt', 'b.txt'],
        isDirectory: () => true,
      },
    });
    expect(ctx.fs.exists('/test')).toBe(false);
    expect(ctx.fs.readFile('/test')).toBe('file content');
    expect(ctx.fs.readdir('/test')).toEqual(['a.txt', 'b.txt']);
    expect(ctx.fs.isDirectory('/test')).toBe(true);
  });

  it('provides default prompt implementations that return sensible values', async () => {
    const ctx = createTestContext();
    // Default confirm returns true
    expect(await ctx.prompt.confirm('proceed?')).toBe(true);
    // Default choose returns first choice
    expect(
      await ctx.prompt.choose('pick', [
        { value: 'first', label: 'First' },
        { value: 'second', label: 'Second' },
      ])
    ).toBe('first');
    // Default text returns defaultValue or empty string
    expect(await ctx.prompt.text('name', 'fallback')).toBe('fallback');
    expect(await ctx.prompt.text('name')).toBe('');
    // info and warn don't throw
    ctx.prompt.info('info message');
    ctx.prompt.warn('warn message');
  });

  it('provides default filesystem implementations', () => {
    const ctx = createTestContext();
    // Default exists returns true
    expect(ctx.fs.exists('/anything')).toBe(true);
    // Default readFile returns empty string
    expect(ctx.fs.readFile('/anything')).toBe('');
    // Default readdir returns empty array
    expect(ctx.fs.readdir('/anything')).toEqual([]);
    // Default isDirectory returns false
    expect(ctx.fs.isDirectory('/anything')).toBe(false);
  });

  it('allows partial prompt overrides (others use defaults)', async () => {
    const ctx = createTestContext({
      prompt: {
        confirm: async () => false,
      },
    });
    // Overridden
    expect(await ctx.prompt.confirm('test')).toBe(false);
    // Still has defaults for non-overridden methods
    expect(await ctx.prompt.choose('test', [{ value: 'x', label: 'X' }])).toBe('x');
  });

  it('allows partial filesystem overrides (others use defaults)', () => {
    const ctx = createTestContext({
      fs: {
        exists: () => false,
      },
    });
    // Overridden
    expect(ctx.fs.exists('/test')).toBe(false);
    // Still has defaults
    expect(ctx.fs.readFile('/test')).toBe('');
  });
});
