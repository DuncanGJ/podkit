#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
GIF="$SCRIPT_DIR/demo.gif"

# Export the demo binary path so the tape can copy it into place
export DEMO_BIN="$SCRIPT_DIR/bin/podkit-demo"

echo "Recording demo..."
cd "$ROOT_DIR"
vhs "$SCRIPT_DIR/demo.tape"

# Optimize the GIF with gifsicle (lossy=80 gives ~40-60% reduction)
if command -v gifsicle &>/dev/null; then
  BEFORE=$(stat -f%z "$GIF")
  gifsicle --optimize=3 --lossy=80 -b "$GIF"
  AFTER=$(stat -f%z "$GIF")
  echo "Optimized: $(( BEFORE / 1024 ))KB → $(( AFTER / 1024 ))KB"
else
  echo "Warning: gifsicle not found, skipping optimization (brew install gifsicle)"
fi

echo "Done! Output: $GIF"
