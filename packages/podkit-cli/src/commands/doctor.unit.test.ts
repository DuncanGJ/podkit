/**
 * Unit tests for doctor command argument validation
 *
 * Tests that --repair-artwork requires explicit -d and -c flags
 * to prevent accidental repairs against the wrong device or collection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const CLI_PATH = join(import.meta.dir, '..', 'main.ts');

let tempDir: string;
let configPath: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'doctor-test-'));
  configPath = join(tempDir, 'config.toml');
  writeFileSync(configPath, `version = 1\n\n[music.testcol]\npath = "/tmp/fake-music"\n`);
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/** Run the CLI with the given args and return { stdout, stderr, exitCode } */
function runCli(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`bun ${CLI_PATH} --config ${configPath} ${args}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.status ?? 1,
    };
  }
}

describe('doctor --repair-artwork argument validation', () => {
  it('requires -d flag when --repair-artwork is used', () => {
    const result = runCli('doctor --repair-artwork');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Repair requires an explicit device');
    expect(result.stderr).toContain('-d');
  });

  it('requires -c flag when --repair-artwork is used', () => {
    // Use a nonexistent path for -d so we get past the device check
    const result = runCli('doctor --repair-artwork -d /tmp/fake-ipod');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Repair requires an explicit collection');
    expect(result.stderr).toContain('-c');
  });

  it('does not require -d or -c for diagnostic-only mode', () => {
    // Without --repair-artwork, doctor should attempt to run diagnostics
    // (will fail because no iPod is connected, but should NOT fail with
    // "requires explicit device/collection" errors)
    const result = runCli('doctor');

    // Should fail for a different reason (no device found), not argument validation
    expect(result.stderr).not.toContain('Repair requires an explicit device');
    expect(result.stderr).not.toContain('Repair requires an explicit collection');
  });

  it('requires both -d and -c together for repair', () => {
    // Only -c without -d
    const result = runCli('doctor --repair-artwork -c navidrome');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Repair requires an explicit device');
  });
});
