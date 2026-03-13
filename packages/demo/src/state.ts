/**
 * Simple file-based state management for cross-invocation persistence.
 *
 * The demo CLI is invoked multiple times in sequence (by VHS), so state
 * must persist across process boundaries. We use a JSON file at a known
 * location for this.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const STATE_FILE = '/tmp/podkit-demo/state.json';

export interface DemoState {
  /** Whether the device has been added / is known */
  deviceAdded: boolean;
  /** Whether music has been synced to the device */
  musicSynced: boolean;
  /** Whether video has been synced to the device */
  videoSynced: boolean;
}

const DEFAULT_STATE: DemoState = {
  deviceAdded: false,
  musicSynced: false,
  videoSynced: false,
};

/**
 * Read the current demo state from disk.
 * Returns default state if the file does not exist or is invalid.
 */
export function readState(): DemoState {
  try {
    if (!existsSync(STATE_FILE)) {
      return { ...DEFAULT_STATE };
    }
    const raw = readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/**
 * Write state to disk. Creates parent directories if needed.
 */
export function writeState(state: DemoState): void {
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

/**
 * Update specific fields in the state and write to disk.
 */
export function updateState(patch: Partial<DemoState>): DemoState {
  const current = readState();
  const updated = { ...current, ...patch };
  writeState(updated);
  return updated;
}

/**
 * Reset state to defaults (useful before recording a new demo).
 */
export function resetState(): void {
  writeState({ ...DEFAULT_STATE });
}
