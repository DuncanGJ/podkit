#!/usr/bin/env bash
set -euo pipefail

# Compile the CLI into a standalone binary with the native .node addon embedded.
#
# Bun's --compile detects static require() calls to .node files and embeds
# them in the compiled binary. At runtime, Bun extracts the .node to a temp
# file, dlopen's it, then deletes it — producing a true single-file binary.
#
# This script stages the correct platform's .node file to a known path
# (packages/libgpod-node/gpod_binding.node) that binding.ts statically
# requires, then compiles the CLI.

CLI_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LIBGPOD_DIR="$CLI_DIR/../libgpod-node"

STAGED="$LIBGPOD_DIR/gpod_binding.node"

PLATFORM=$(node -p 'process.platform')
ARCH=$(node -p 'process.arch')

# Try prebuild first (CI creates these via prebuildify), then local node-gyp build.
# Prebuildify names the file after the package (e.g., @podkit+libgpod-node.node),
# so we find any .node file in the platform directory rather than hardcoding.
PREBUILD_DIR="$LIBGPOD_DIR/prebuilds/${PLATFORM}-${ARCH}"
PREBUILD=$(find "$PREBUILD_DIR" -name "*.node" -type f 2>/dev/null | head -1)
LOCAL_BUILD="$LIBGPOD_DIR/build/Release/gpod_binding.node"

if [ -n "$PREBUILD" ]; then
  cp "$PREBUILD" "$STAGED"
  echo "Staged prebuild: ${PREBUILD#"$LIBGPOD_DIR/"}"
elif [ -f "$LOCAL_BUILD" ]; then
  cp "$LOCAL_BUILD" "$STAGED"
  echo "Staged local build: build/Release/gpod_binding.node"
else
  echo "ERROR: No native binding found."
  echo "  Searched: $PREBUILD_DIR/*.node"
  echo "       and: $LOCAL_BUILD"
  echo "  Run 'bun run build:native' in packages/libgpod-node to build from source,"
  echo "  or run 'npx prebuildify --napi --strip' to create a prebuild."
  exit 1
fi

cleanup() { rm -f "$STAGED"; }
trap cleanup EXIT

# Compile the CLI binary
cd "$CLI_DIR"
VERSION=$(jq -r .version package.json)
bun build --compile src/main.ts --outfile bin/podkit --define "PODKIT_VERSION='$VERSION'"

echo "Compiled: bin/podkit (v$VERSION)"
