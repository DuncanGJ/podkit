import { describe, expect, it } from 'bun:test';
import {
  formatProgressLine,
  truncateTrackName,
  formatOverallLine,
  formatCurrentLineWithBar,
  formatCurrentLineText,
  DualProgressDisplay,
} from './progress.js';

describe('truncateTrackName', () => {
  it('returns empty string for undefined', () => {
    expect(truncateTrackName(undefined)).toBe('');
  });

  it('returns name unchanged when within limit', () => {
    expect(truncateTrackName('Short', 40)).toBe('Short');
  });

  it('truncates with ellipsis when exceeding limit', () => {
    expect(truncateTrackName('A Very Long Track Name', 10)).toBe('A Very ...');
  });
});

describe('formatProgressLine', () => {
  const bar = '[======>       ] 50%';
  const barLength = bar.length; // 20
  // eslint-disable-next-line no-control-regex
  const ansiPrefix = /\r\x1b\[K/;

  it('fits output within terminal width', () => {
    const line = formatProgressLine({
      bar,
      phase: 'Transcoding',
      trackName: 'A Really Long Track Name That Would Normally Overflow',
      speed: 1.5,
      terminalWidth: 60,
    });
    // Strip ANSI escape prefix
    const visible = line.replace(ansiPrefix, '');
    expect(visible.length).toBeLessThanOrEqual(60);
  });

  it('omits track name when terminal is too narrow', () => {
    const line = formatProgressLine({
      bar,
      phase: 'Transcoding',
      trackName: 'Some Track',
      terminalWidth: barLength + 'Transcoding'.length + 3, // barely fits base
    });
    const visible = line.replace(ansiPrefix, '');
    expect(visible).not.toContain('Some Track');
    expect(visible).toContain('Transcoding');
  });

  it('shows full track name when terminal is wide enough', () => {
    const line = formatProgressLine({
      bar,
      phase: 'Transcoding',
      trackName: 'Short',
      terminalWidth: 120,
    });
    const visible = line.replace(ansiPrefix, '');
    expect(visible).toContain('Short');
  });

  it('includes speed when provided', () => {
    const line = formatProgressLine({
      bar,
      phase: 'Transcoding',
      speed: 2.3,
      terminalWidth: 80,
    });
    const visible = line.replace(ansiPrefix, '');
    expect(visible).toContain('(2.3x)');
  });

  it('works without track name', () => {
    const line = formatProgressLine({
      bar,
      phase: 'Copying',
      terminalWidth: 80,
    });
    const visible = line.replace(ansiPrefix, '');
    expect(visible).toBe(`${bar} Copying`);
  });

  it('truncates track name to fill available width exactly', () => {
    const longName = 'A'.repeat(100);
    const line = formatProgressLine({
      bar,
      phase: 'Transcoding',
      trackName: longName,
      terminalWidth: 60,
    });
    const visible = line.replace(ansiPrefix, '');
    expect(visible.length).toBeLessThanOrEqual(60);
    expect(visible).toContain('...');
  });
});

describe('formatOverallLine', () => {
  it('includes bar, counter, and unit', () => {
    const line = formatOverallLine(3, 11, 'videos');
    expect(line).toContain('Overall:');
    expect(line).toContain('3/11 videos');
    expect(line).toContain('%');
  });

  it('shows 0% at start', () => {
    const line = formatOverallLine(0, 10, 'tracks');
    expect(line).toContain('0%');
    expect(line).toContain('0/10 tracks');
  });

  it('shows 100% when complete', () => {
    const line = formatOverallLine(5, 5, 'videos');
    expect(line).toContain('100%');
    expect(line).toContain('5/5 videos');
  });
});

describe('formatCurrentLineWithBar', () => {
  it('includes prefix, bar, phase, and track name', () => {
    const line = formatCurrentLineWithBar({
      percent: 52,
      phase: 'Transcoding',
      trackName: 'Test Track',
      speed: 2.1,
    });
    expect(line).toContain('Current:');
    expect(line).toContain('52%');
    expect(line).toContain('Transcoding');
    expect(line).toContain('(2.1x)');
  });

  it('works without speed', () => {
    const line = formatCurrentLineWithBar({
      percent: 30,
      phase: 'Transcoding',
      trackName: 'Song',
    });
    expect(line).toContain('Current:');
    expect(line).toContain('30%');
    expect(line).not.toContain('x)');
  });
});

describe('formatCurrentLineText', () => {
  it('shows phase and track name', () => {
    const line = formatCurrentLineText({
      phase: 'Copying',
      trackName: 'My Track',
    });
    expect(line).toContain('Current:');
    expect(line).toContain('Copying');
    expect(line).toContain('My Track');
  });

  it('works without track name', () => {
    const line = formatCurrentLineText({ phase: 'Removing' });
    expect(line).toContain('Current:');
    expect(line).toContain('Removing');
  });
});

describe('DualProgressDisplay', () => {
  it('writes both lines on first update', () => {
    const output: string[] = [];
    const display = new DualProgressDisplay((content) => output.push(content));

    display.update('Overall line', 'Current line');

    expect(output).toHaveLength(1);
    expect(output[0]).toBe('Overall line\nCurrent line');
  });

  it('uses cursor movement on subsequent updates', () => {
    const output: string[] = [];
    const display = new DualProgressDisplay((content) => output.push(content));

    display.update('Overall 1', 'Current 1');
    display.update('Overall 2', 'Current 2');

    expect(output).toHaveLength(2);
    // Second update should move cursor up and rewrite both lines
    expect(output[1]).toContain('\x1b[A'); // cursor up
    expect(output[1]).toContain('Overall 2');
    expect(output[1]).toContain('Current 2');
  });

  it('finish clears both lines and resets state', () => {
    const output: string[] = [];
    const display = new DualProgressDisplay((content) => output.push(content));

    display.update('Overall', 'Current');
    display.finish();

    // After finish, next update should write fresh (not use cursor movement)
    display.update('New overall', 'New current');

    expect(output[2]).toBe('New overall\nNew current');
  });

  it('finish is a no-op when nothing has been rendered', () => {
    const output: string[] = [];
    const display = new DualProgressDisplay((content) => output.push(content));

    display.finish();

    expect(output).toHaveLength(0);
  });
});
