import { describe, expect, it } from 'bun:test';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { statusCommand } from './commands/status.js';
import { listCommand } from './commands/list.js';

describe('podkit-cli commands', () => {
  it('init command is defined with correct name', () => {
    expect(initCommand.name()).toBe('init');
    expect(initCommand.description()).toContain('config');
  });

  it('sync command is defined with correct name', () => {
    expect(syncCommand.name()).toBe('sync');
    expect(syncCommand.description()).toContain('sync');
  });

  it('status command is defined with correct name', () => {
    expect(statusCommand.name()).toBe('status');
    expect(statusCommand.description()).toContain('iPod');
  });

  it('list command is defined with correct name', () => {
    expect(listCommand.name()).toBe('list');
    expect(listCommand.description()).toContain('tracks');
  });

  it('sync command has expected options', () => {
    const opts = syncCommand.options.map(o => o.long);
    expect(opts).toContain('--source');
    expect(opts).toContain('--dry-run');
    expect(opts).toContain('--quality');
    expect(opts).toContain('--filter');
    expect(opts).toContain('--no-artwork');
    expect(opts).toContain('--delete');
  });

  it('list command has expected options', () => {
    const opts = listCommand.options.map(o => o.long);
    expect(opts).toContain('--source');
    expect(opts).toContain('--format');
    expect(opts).toContain('--fields');
  });
});
