/**
 * Mock filesystem validation for the demo CLI build.
 *
 * Replaces packages/podkit-cli/src/utils/fs.ts so that path validation
 * always passes, allowing display-friendly paths like ~/media/music.
 */

export function existsSync(_path: string): boolean {
  return true;
}

export function statSync(_path: string): any {
  return {
    isDirectory: () => true,
    isFile: () => true,
    isSymbolicLink: () => false,
    size: 0,
    mtime: new Date(),
    atime: new Date(),
    ctime: new Date(),
    birthtime: new Date(),
    mode: 0o755,
    uid: 0,
    gid: 0,
  };
}

export function statfsSync(_path: string): any {
  return {
    type: 0,
    bsize: 4096,
    blocks: 39062500, // ~160GB
    bfree: 38000000, // ~155GB free
    bavail: 38000000,
    files: 1000000,
    ffree: 999000,
  };
}
