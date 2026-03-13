/**
 * Filesystem validation utilities.
 *
 * Thin wrappers around node:fs functions used for path validation in CLI
 * commands. Extracted into a separate module so they can be swapped out
 * in the demo build.
 */

import {
  existsSync as _existsSync,
  statSync as _statSync,
  statfsSync as _statfsSync,
} from 'node:fs';

export const existsSync = _existsSync;
export const statSync = _statSync;
export const statfsSync = _statfsSync;
