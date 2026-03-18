#!/usr/bin/env node
/**
 * Check if a prebuild exists for the current platform.
 * Exits 0 if found (skip native build), 1 if not found (need to build).
 *
 * On Linux, detects musl vs glibc to select the correct prebuild directory:
 *   - glibc: prebuilds/linux-x64/
 *   - musl:  prebuilds/linux-x64-musl/
 */
const { readdirSync, readFileSync } = require('fs');
const { platform, arch } = require('os');
const { join } = require('path');
const { execSync } = require('child_process');

function isMusl() {
  if (platform() !== 'linux') return false;
  try {
    const lddOutput = execSync('ldd /bin/sh 2>&1', { encoding: 'utf8' });
    return lddOutput.includes('musl');
  } catch {
    // If ldd fails, check for the musl dynamic linker
    try {
      readFileSync('/lib/ld-musl-x86_64.so.1');
      return true;
    } catch {
      try {
        readFileSync('/lib/ld-musl-aarch64.so.1');
        return true;
      } catch {
        return false;
      }
    }
  }
}

const suffix = isMusl() ? '-musl' : '';
const dirName = `${platform()}-${arch()}${suffix}`;
const dir = join(__dirname, '..', 'prebuilds', dirName);

try {
  const files = readdirSync(dir);
  if (files.some((f) => f.endsWith('.node'))) {
    console.log(`Prebuild found for ${dirName}, skipping native build`);
    process.exit(0);
  }
} catch {
  // Directory doesn't exist
}

process.exit(1);
