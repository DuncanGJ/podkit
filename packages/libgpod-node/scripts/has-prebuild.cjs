#!/usr/bin/env node
/**
 * Check if a prebuild exists for the current platform.
 * Exits 0 if found (skip native build), 1 if not found (need to build).
 */
const { readdirSync } = require('fs');
const { platform, arch } = require('os');
const { join } = require('path');

const dir = join(__dirname, '..', 'prebuilds', `${platform()}-${arch()}`);

try {
  const files = readdirSync(dir);
  if (files.some((f) => f.endsWith('.node'))) {
    console.log(`Prebuild found for ${platform()}-${arch()}, skipping native build`);
    process.exit(0);
  }
} catch {
  // Directory doesn't exist
}

process.exit(1);
