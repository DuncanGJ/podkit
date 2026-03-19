import { describe, it, expect, afterEach } from 'bun:test';
import { unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { touchHealthFile, isHealthy } from './health-check.js';

const TEST_HEALTH_FILE = join(tmpdir(), `podkit-health-test-${process.pid}`);

describe('health-check', () => {
  afterEach(() => {
    try {
      unlinkSync(TEST_HEALTH_FILE);
    } catch {
      // ignore
    }
  });

  describe('touchHealthFile', () => {
    it('creates the health file', () => {
      expect(existsSync(TEST_HEALTH_FILE)).toBe(false);
      touchHealthFile(TEST_HEALTH_FILE);
      expect(existsSync(TEST_HEALTH_FILE)).toBe(true);
    });

    it('updates the health file on subsequent calls', () => {
      touchHealthFile(TEST_HEALTH_FILE);
      const firstCheck = isHealthy(60, TEST_HEALTH_FILE);
      expect(firstCheck).toBe(true);

      touchHealthFile(TEST_HEALTH_FILE);
      const secondCheck = isHealthy(60, TEST_HEALTH_FILE);
      expect(secondCheck).toBe(true);
    });
  });

  describe('isHealthy', () => {
    it('returns true when file is fresh', () => {
      touchHealthFile(TEST_HEALTH_FILE);
      expect(isHealthy(60, TEST_HEALTH_FILE)).toBe(true);
    });

    it('returns false when file does not exist', () => {
      expect(isHealthy(60, TEST_HEALTH_FILE)).toBe(false);
    });

    it('returns false when file is stale', () => {
      touchHealthFile(TEST_HEALTH_FILE);
      // Use a maxAge of 0 seconds — the file was just created so it's already "stale"
      expect(isHealthy(0, TEST_HEALTH_FILE)).toBe(false);
    });
  });
});
