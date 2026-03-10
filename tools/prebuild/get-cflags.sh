#!/bin/bash
# Output compiler flags for libgpod-node native build.
#
# When STATIC_DEPS_DIR is set (CI prebuild), outputs flags pointing to
# the static dependency install prefix. Otherwise, falls back to pkg-config.

set -e

if [ -n "$STATIC_DEPS_DIR" ]; then
  echo "-I${STATIC_DEPS_DIR}/include -I${STATIC_DEPS_DIR}/include/gpod-1.0 -I${STATIC_DEPS_DIR}/include/glib-2.0 -I${STATIC_DEPS_DIR}/lib/glib-2.0/include"
else
  if [ "$(uname)" = "Darwin" ]; then
    PKG_CONFIG_PATH="${HOME}/.local/lib/pkgconfig:${PKG_CONFIG_PATH}" pkg-config --cflags libgpod-1.0 glib-2.0
  else
    pkg-config --cflags libgpod-1.0 glib-2.0
  fi
fi
