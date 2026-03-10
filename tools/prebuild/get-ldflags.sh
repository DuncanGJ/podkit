#!/bin/bash
# Output linker flags for libgpod-node native build.
#
# When STATIC_DEPS_DIR is set (CI prebuild), outputs flags to statically
# link libgpod and all dependencies into the .node binary.
# Otherwise, falls back to pkg-config for dynamic linking.

set -e

if [ -n "$STATIC_DEPS_DIR" ]; then
  # Static linking: reference .a files directly so no dynamic deps remain.
  # Order matters for static linking — dependents before dependencies.
  LIBS=""

  # libgpod (core)
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libgpod.a"

  # GLib stack
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libgio-2.0.a"
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libgobject-2.0.a"
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libgmodule-2.0.a"
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libglib-2.0.a"

  # gdk-pixbuf (for artwork)
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libgdk_pixbuf-2.0.a"

  # libplist (for iPhone/iPod Touch support)
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libplist-2.0.a"

  # GLib/GObject transitive deps
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libffi.a"
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libpcre2-8.a"
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libintl.a"

  # Image format libs (gdk-pixbuf dependencies)
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libpng16.a"
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libjpeg.a"
  LIBS="$LIBS ${STATIC_DEPS_DIR}/lib/libtiff.a"

  # System libraries
  if [ "$(uname)" = "Darwin" ]; then
    LIBS="$LIBS -liconv -lz -lm -lresolv -framework Foundation -framework CoreFoundation -framework AppKit -framework Carbon"
  else
    LIBS="$LIBS -lz -lm -lresolv -lpthread"
  fi

  echo "$LIBS"
else
  if [ "$(uname)" = "Darwin" ]; then
    PKG_CONFIG_PATH="${HOME}/.local/lib/pkgconfig:${PKG_CONFIG_PATH}" pkg-config --libs libgpod-1.0 glib-2.0
  else
    pkg-config --libs libgpod-1.0 glib-2.0
  fi
fi
