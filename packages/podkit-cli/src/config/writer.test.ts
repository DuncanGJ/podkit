/**
 * Unit tests for config writer
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { updateIpodIdentity, removeIpodIdentity } from './writer.js';

describe('config writer', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'podkit-test-'));
    configPath = path.join(tempDir, 'config.toml');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('updateIpodIdentity', () => {
    it('creates new config file with ipod section', () => {
      const result = updateIpodIdentity(
        { volumeUuid: 'ABC-123', volumeName: 'TestPod' },
        { configPath, createIfMissing: true }
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(result.configPath).toBe(configPath);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('[ipod]');
      expect(content).toContain('volumeUuid = "ABC-123"');
      expect(content).toContain('volumeName = "TestPod"');
    });

    it('appends ipod section to existing config', () => {
      fs.writeFileSync(configPath, 'quality = "high"\n');

      const result = updateIpodIdentity(
        { volumeUuid: 'XYZ-789', volumeName: 'MyPod' },
        { configPath }
      );

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('quality = "high"');
      expect(content).toContain('[ipod]');
      expect(content).toContain('volumeUuid = "XYZ-789"');
    });

    it('replaces existing ipod section', () => {
      fs.writeFileSync(
        configPath,
        `quality = "high"\n\n[ipod]\nvolumeUuid = "OLD-UUID"\nvolumeName = "OldPod"\n`
      );

      const result = updateIpodIdentity(
        { volumeUuid: 'NEW-UUID', volumeName: 'NewPod' },
        { configPath }
      );

      expect(result.success).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('volumeUuid = "NEW-UUID"');
      expect(content).toContain('volumeName = "NewPod"');
      expect(content).not.toContain('OLD-UUID');
      expect(content).not.toContain('OldPod');
    });

    it('fails when file does not exist and createIfMissing is false', () => {
      const result = updateIpodIdentity(
        { volumeUuid: 'ABC-123', volumeName: 'TestPod' },
        { configPath, createIfMissing: false }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('creates parent directories if needed', () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'config.toml');

      const result = updateIpodIdentity(
        { volumeUuid: 'ABC-123', volumeName: 'TestPod' },
        { configPath: nestedPath, createIfMissing: true }
      );

      expect(result.success).toBe(true);
      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  describe('removeIpodIdentity', () => {
    it('removes ipod section from config', () => {
      fs.writeFileSync(
        configPath,
        `quality = "high"\n\n[ipod]\nvolumeUuid = "ABC-123"\nvolumeName = "TestPod"\n`
      );

      const result = removeIpodIdentity({ configPath });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('quality = "high"');
      expect(content).not.toContain('[ipod]');
      expect(content).not.toContain('volumeUuid');
    });

    it('succeeds when file does not exist', () => {
      const result = removeIpodIdentity({ configPath });
      expect(result.success).toBe(true);
    });

    it('succeeds when ipod section does not exist', () => {
      fs.writeFileSync(configPath, 'quality = "high"\n');

      const result = removeIpodIdentity({ configPath });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('quality = "high"');
    });
  });
});
