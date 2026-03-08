import { describe, expect, it } from 'bun:test';
import { clearCommand } from './clear.js';

describe('clear command', () => {
  describe('command structure', () => {
    it('has correct name', () => {
      expect(clearCommand.name()).toBe('clear');
    });

    it('has description', () => {
      expect(clearCommand.description()).toBeTruthy();
      expect(clearCommand.description()).toContain('remove');
    });

    it('requires a type argument', () => {
      const typeArg = clearCommand.registeredArguments.find(
        (arg) => arg.name() === 'type'
      );
      expect(typeArg).toBeDefined();
      expect(typeArg?.required).toBe(true);
    });

    it('has --confirm option', () => {
      const confirmOption = clearCommand.options.find(
        (opt) => opt.long === '--confirm'
      );
      expect(confirmOption).toBeDefined();
    });

    it('has --dry-run option', () => {
      const dryRunOption = clearCommand.options.find(
        (opt) => opt.long === '--dry-run'
      );
      expect(dryRunOption).toBeDefined();
    });
  });
});
