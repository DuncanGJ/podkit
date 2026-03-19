import { describe, it, expect } from 'bun:test';
import { createTestContext } from '../test-utils.js';
import { exampleSectionRestructure } from './example-section-restructure.js';
import { exampleFieldRename } from './example-field-rename.js';
import { exampleNewRequiredField } from './example-new-required-field.js';
import { exampleNewOptionalFeature } from './example-new-optional-feature.js';
import { exampleDeprecation } from './example-deprecation.js';
import { exampleEnvVarChange } from './example-env-var-change.js';

describe('example migrations', () => {
  describe('section restructure: [video.*] → [media.*]', () => {
    it('renames video sections to media', async () => {
      const input = [
        'version = 90',
        '',
        '[video.movies]',
        'path = "/media/movies"',
        '',
        '[video.shows]',
        'path = "/media/shows"',
        '',
        '[music.main]',
        'path = "/media/music"',
      ].join('\n');

      const context = createTestContext();
      const result = await exampleSectionRestructure.migrate(input, context);

      expect(result).toContain('[media.movies]');
      expect(result).toContain('[media.shows]');
      expect(result).not.toContain('[video.');
      // Music sections should be untouched
      expect(result).toContain('[music.main]');
      expect(result).toContain('path = "/media/movies"');
    });

    it('renames video key in [defaults] to media', async () => {
      const input = [
        'version = 90',
        '',
        '[defaults]',
        'device = "ipod"',
        'video = "movies"',
        'music = "main"',
        '',
        '[video.movies]',
        'path = "/media/movies"',
      ].join('\n');

      const context = createTestContext();
      const result = await exampleSectionRestructure.migrate(input, context);

      expect(result).toContain('media = "movies"');
      expect(result).not.toMatch(/^video\s*=/m);
      // Other defaults keys should be untouched
      expect(result).toContain('device = "ipod"');
      expect(result).toContain('music = "main"');
    });

    it('handles config with no video sections', async () => {
      const input = ['version = 90', '', '[music.main]', 'path = "/media/music"'].join('\n');

      const context = createTestContext();
      const result = await exampleSectionRestructure.migrate(input, context);

      expect(result).toBe(input);
    });
  });

  describe('field rename: customBitrate → bitrate', () => {
    it('renames customBitrate in global scope', async () => {
      const input = ['version = 91', 'quality = "high"', 'customBitrate = 256'].join('\n');

      const context = createTestContext();
      const result = await exampleFieldRename.migrate(input, context);

      expect(result).toContain('bitrate = 256');
      expect(result).not.toContain('customBitrate');
    });

    it('renames customBitrate in device sections', async () => {
      const input = [
        'version = 91',
        '',
        '[devices.ipod]',
        'volumeName = "iPod"',
        'customBitrate = 192',
        '',
        '[devices.nano]',
        'volumeName = "Nano"',
        'customBitrate = 128',
      ].join('\n');

      const context = createTestContext();
      const result = await exampleFieldRename.migrate(input, context);

      expect(result).toContain('bitrate = 192');
      expect(result).toContain('bitrate = 128');
      expect(result).not.toContain('customBitrate');
    });

    it('leaves config unchanged when customBitrate is absent', async () => {
      const input = ['version = 91', 'quality = "high"'].join('\n');

      const context = createTestContext();
      const result = await exampleFieldRename.migrate(input, context);

      expect(result).toBe(input);
    });
  });

  describe('new required field: encoding', () => {
    it('adds encoding after last global field when missing', async () => {
      const input = [
        'version = 92',
        'quality = "high"',
        'artwork = true',
        '',
        '[music.main]',
        'path = "/media/music"',
      ].join('\n');

      const context = createTestContext();
      const result = await exampleNewRequiredField.migrate(input, context);

      // encoding should appear after the global fields, before the music section
      const lines = result.split('\n');
      const encodingIndex = lines.findIndex((l) => l.includes('encoding = "vbr"'));
      const musicIndex = lines.findIndex((l) => l.includes('[music.main]'));
      expect(encodingIndex).toBeGreaterThan(-1);
      expect(encodingIndex).toBeLessThan(musicIndex);
    });

    it('does not add encoding if already present', async () => {
      const input = [
        'version = 92',
        'quality = "high"',
        'encoding = "cbr"',
        '',
        '[music.main]',
        'path = "/media/music"',
      ].join('\n');

      const context = createTestContext();
      const result = await exampleNewRequiredField.migrate(input, context);

      // Should be unchanged — encoding already exists
      expect(result).toBe(input);
      // Verify it didn't add a duplicate
      const matches = result.match(/encoding/g);
      expect(matches).toHaveLength(1);
    });

    it('inserts at the top when there are no global fields', async () => {
      const input = ['[music.main]', 'path = "/media/music"'].join('\n');

      const context = createTestContext();
      const result = await exampleNewRequiredField.migrate(input, context);

      const lines = result.split('\n');
      expect(lines[0]).toBe('encoding = "vbr"');
    });
  });

  describe('new optional feature: Sound Check (interactive)', () => {
    it('adds Sound Check section when user accepts', async () => {
      const input = [
        'version = 93',
        'quality = "high"',
        '',
        '[music.main]',
        'path = "/media/music"',
      ].join('\n');

      const context = createTestContext({
        prompt: {
          confirm: async () => true,
        },
      });
      const result = await exampleNewOptionalFeature.migrate(input, context);

      expect(result).toContain('[transforms.soundCheck]');
      expect(result).toContain('enabled = true');
    });

    it('returns content unchanged when user declines', async () => {
      const input = [
        'version = 93',
        'quality = "high"',
        '',
        '[music.main]',
        'path = "/media/music"',
      ].join('\n');

      const context = createTestContext({
        prompt: {
          confirm: async () => false,
        },
      });
      const result = await exampleNewOptionalFeature.migrate(input, context);

      expect(result).not.toContain('[transforms.soundCheck]');
      expect(result).not.toContain('enabled = true');
    });
  });

  describe('deprecation: source → path', () => {
    it('renames source to path in music sections', async () => {
      const input = [
        'version = 94',
        '',
        '[music.main]',
        'source = "/media/music"',
        'type = "directory"',
        '',
        '[music.jazz]',
        'source = "/media/jazz"',
      ].join('\n');

      const context = createTestContext();
      const result = await exampleDeprecation.migrate(input, context);

      expect(result).toContain('path = "/media/music"');
      expect(result).toContain('path = "/media/jazz"');
      expect(result).not.toMatch(/^source\s*=/m);
      // Should include migration comment
      expect(result).toContain("# Migrated from 'source' field");
      // Other fields in the section should be untouched
      expect(result).toContain('type = "directory"');
    });

    it('does not rename source outside music sections', async () => {
      const input = [
        'version = 94',
        '',
        '[other.thing]',
        'source = "something"',
        '',
        '[music.main]',
        'source = "/media/music"',
      ].join('\n');

      const context = createTestContext();
      const result = await exampleDeprecation.migrate(input, context);

      // The [other.thing] source should be unchanged
      const lines = result.split('\n');
      const otherSourceLine = lines.find(
        (l, i) => l.includes('source = "something"') && i < lines.indexOf('[music.main]')
      );
      expect(otherSourceLine).toBeDefined();

      // The [music.main] source should be renamed
      expect(result).toContain('path = "/media/music"');
    });

    it('handles config with no source fields', async () => {
      const input = ['version = 94', '', '[music.main]', 'path = "/media/music"'].join('\n');

      const context = createTestContext();
      const result = await exampleDeprecation.migrate(input, context);

      expect(result).toBe(input);
    });
  });

  describe('env var change notification', () => {
    it('returns content unchanged and shows warnings', async () => {
      const input = [
        'version = 95',
        'quality = "high"',
        '',
        '[music.main]',
        'path = "/media/music"',
      ].join('\n');

      const warnings: string[] = [];
      const infos: string[] = [];
      const context = createTestContext({
        prompt: {
          warn: (msg: string) => {
            warnings.push(msg);
          },
          info: (msg: string) => {
            infos.push(msg);
          },
        },
      });

      const result = await exampleEnvVarChange.migrate(input, context);

      // Content should be completely unchanged — only the version bump (handled by
      // the engine, not the migration) will modify the file
      expect(result).toBe(input);

      // Verify the migration communicated the env var change
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('PODKIT_VIDEO_PATH'))).toBe(true);
      expect(infos.some((i) => i.includes('PODKIT_MEDIA_PATH'))).toBe(true);
    });
  });
});
