#!/bin/bash
set -e

# Build static dependencies for libgpod-node prebuilds.
#
# Produces a self-contained prefix at STATIC_DEPS_DIR with static libraries
# for libgpod and all its transitive dependencies. The resulting .node binary
# will have no runtime dependency on libgpod, glib, or any other native lib.
#
# Usage:
#   STATIC_DEPS_DIR=/path/to/prefix ./build-static-deps.sh
#
# Platforms:
#   macOS (x64/arm64): Builds everything from source via Homebrew deps
#   Linux (x64/arm64): Uses system packages + builds libgpod from source

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LIBGPOD_MACOS_DIR="$REPO_ROOT/tools/libgpod-macos"

# Output prefix (set by caller, e.g., CI workflow)
STATIC_DEPS_DIR="${STATIC_DEPS_DIR:-$REPO_ROOT/static-deps}"
WORK_DIR="${WORK_DIR:-$REPO_ROOT/.prebuild-work}"

NPROC=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

log() { echo "==> $1"; }

mkdir -p "$STATIC_DEPS_DIR/lib" "$STATIC_DEPS_DIR/include" "$STATIC_DEPS_DIR/lib/pkgconfig"
mkdir -p "$WORK_DIR"

OS="$(uname)"
ARCH="$(uname -m)"

# ---------------------------------------------------------------------------
# macOS: build GLib, gdk-pixbuf, libplist, and libgpod from source as static
# ---------------------------------------------------------------------------
if [ "$OS" = "Darwin" ]; then
  HOMEBREW_PREFIX="$(brew --prefix)"

  # Collect Homebrew lib paths for image libraries (libpng, jpeg, tiff)
  # These are needed at link time when building gdk-pixbuf's tools/tests
  HOMEBREW_LIB_PATHS="-L$STATIC_DEPS_DIR/lib"
  for formula in libpng jpeg-turbo libtiff zstd xz; do
    fprefix="$(brew --prefix "$formula" 2>/dev/null || true)"
    if [ -n "$fprefix" ] && [ -d "$fprefix/lib" ]; then
      HOMEBREW_LIB_PATHS="$HOMEBREW_LIB_PATHS -L$fprefix/lib"
    fi
  done

  # Helper: build a Meson project with static libs
  build_meson_static() {
    local name="$1" src="$2"
    shift 2
    log "Building $name (static)..."
    cd "$src"
    # Remove stale build dir if exists
    rm -rf _build
    meson setup _build --prefix="$STATIC_DEPS_DIR" \
      --default-library=static \
      --pkg-config-path="$STATIC_DEPS_DIR/lib/pkgconfig:$HOMEBREW_PREFIX/lib/pkgconfig:$(brew --prefix libpng)/lib/pkgconfig:$(brew --prefix jpeg-turbo)/lib/pkgconfig:$(brew --prefix libtiff)/lib/pkgconfig" \
      -Dc_args="-I$STATIC_DEPS_DIR/include" \
      -Dc_link_args="$HOMEBREW_LIB_PATHS" \
      "$@"
    ninja -C _build -j"$NPROC"
    ninja -C _build install
    cd "$WORK_DIR"
  }

  # 1. Copy Homebrew static libs that we can reuse directly
  log "Copying static libraries from Homebrew..."

  copy_if_exists() {
    local src="$1" dst="$2"
    if [ -f "$src" ]; then
      cp "$src" "$dst"
    else
      log "  WARNING: $src not found, will need to build from source"
    fi
  }

  # GLib (has static libs in Homebrew)
  GLIB_PREFIX="$(brew --prefix glib)"
  for lib in libglib-2.0.a libgobject-2.0.a libgio-2.0.a libgmodule-2.0.a; do
    copy_if_exists "$GLIB_PREFIX/lib/$lib" "$STATIC_DEPS_DIR/lib/$lib"
  done
  # Copy glib headers and pkg-config
  cp -R "$GLIB_PREFIX/include/glib-2.0" "$STATIC_DEPS_DIR/include/" 2>/dev/null || true
  cp -R "$GLIB_PREFIX/lib/glib-2.0" "$STATIC_DEPS_DIR/lib/" 2>/dev/null || true
  for pc in glib-2.0.pc gobject-2.0.pc gio-2.0.pc gmodule-2.0.pc; do
    copy_if_exists "$GLIB_PREFIX/lib/pkgconfig/$pc" "$STATIC_DEPS_DIR/lib/pkgconfig/$pc"
  done

  # gettext/intl
  GETTEXT_PREFIX="$(brew --prefix gettext)"
  copy_if_exists "$GETTEXT_PREFIX/lib/libintl.a" "$STATIC_DEPS_DIR/lib/libintl.a"
  cp -R "$GETTEXT_PREFIX/include/libintl.h" "$STATIC_DEPS_DIR/include/" 2>/dev/null || true

  # pcre2
  PCRE2_PREFIX="$(brew --prefix pcre2)"
  copy_if_exists "$PCRE2_PREFIX/lib/libpcre2-8.a" "$STATIC_DEPS_DIR/lib/libpcre2-8.a"

  # libffi
  LIBFFI_PREFIX="$(brew --prefix libffi)"
  copy_if_exists "$LIBFFI_PREFIX/lib/libffi.a" "$STATIC_DEPS_DIR/lib/libffi.a"

  # libplist
  LIBPLIST_PREFIX="$(brew --prefix libplist)"
  copy_if_exists "$LIBPLIST_PREFIX/lib/libplist-2.0.a" "$STATIC_DEPS_DIR/lib/libplist-2.0.a"
  cp -R "$LIBPLIST_PREFIX/include/plist" "$STATIC_DEPS_DIR/include/" 2>/dev/null || true

  # Image libraries for gdk-pixbuf
  for formula in libpng jpeg-turbo libtiff; do
    PREFIX="$(brew --prefix "$formula" 2>/dev/null || true)"
    if [ -n "$PREFIX" ] && [ -d "$PREFIX" ]; then
      for a in "$PREFIX"/lib/*.a; do
        [ -f "$a" ] && cp "$a" "$STATIC_DEPS_DIR/lib/"
      done
      cp -R "$PREFIX"/include/* "$STATIC_DEPS_DIR/include/" 2>/dev/null || true
    fi
  done

  # 2. Build gdk-pixbuf as static (Homebrew doesn't ship .a)
  GDK_PIXBUF_VERSION="2.42.12"
  if [ ! -f "$STATIC_DEPS_DIR/lib/libgdk_pixbuf-2.0.a" ]; then
    cd "$WORK_DIR"
    if [ ! -d "gdk-pixbuf-${GDK_PIXBUF_VERSION}" ]; then
      log "Downloading gdk-pixbuf source..."
      curl -sL "https://download.gnome.org/sources/gdk-pixbuf/2.42/gdk-pixbuf-${GDK_PIXBUF_VERSION}.tar.xz" | tar xJ
    fi
    build_meson_static "gdk-pixbuf" "gdk-pixbuf-${GDK_PIXBUF_VERSION}" \
      -Dman=false -Dgtk_doc=false -Dintrospection=disabled \
      -Dinstalled_tests=false -Dbuiltin_loaders=png,jpeg \
      -Dtests=false
  else
    log "gdk-pixbuf already built, skipping"
  fi

  # 3. Build libgpod as static
  if [ ! -f "$STATIC_DEPS_DIR/lib/libgpod.a" ]; then
    log "Building libgpod from source (static)..."
    cd "$WORK_DIR"

    LIBGPOD_VERSION="0.8.3"
    LIBGPOD_URL="https://downloads.sourceforge.net/project/gtkpod/libgpod/libgpod-0.8/libgpod-${LIBGPOD_VERSION}.tar.bz2"

    # Download
    if [ ! -f "libgpod-${LIBGPOD_VERSION}.tar.bz2" ]; then
      log "Downloading libgpod source..."
      curl -L -o "libgpod-${LIBGPOD_VERSION}.tar.bz2" "$LIBGPOD_URL"
    fi

    # Extract
    rm -rf "libgpod-${LIBGPOD_VERSION}"
    tar -xjf "libgpod-${LIBGPOD_VERSION}.tar.bz2"
    cd "libgpod-${LIBGPOD_VERSION}"

    # Apply patches (same ones used by tools/libgpod-macos/build.sh)
    curl -sL -o callout.patch "https://raw.githubusercontent.com/macports/macports-ports/master/multimedia/libgpod/files/patch-tools-generic-callout.c.diff"
    curl -sL -o libplist.patch "https://raw.githubusercontent.com/pld-linux/libgpod/master/libgpod-libplist.patch"
    patch -p0 < callout.patch
    patch -p1 < libplist.patch

    export PKG_CONFIG_PATH="$STATIC_DEPS_DIR/lib/pkgconfig:$HOMEBREW_PREFIX/lib/pkgconfig"
    export CFLAGS="-I$STATIC_DEPS_DIR/include -I$HOMEBREW_PREFIX/include"
    export LDFLAGS="-L$STATIC_DEPS_DIR/lib -L$HOMEBREW_PREFIX/lib"

    autoreconf -fi
    ./configure \
      --prefix="$STATIC_DEPS_DIR" \
      --enable-static \
      --disable-shared \
      --disable-more-warnings \
      --disable-silent-rules \
      --disable-udev \
      --disable-pygobject \
      --with-python=no \
      --without-hal
    make -j"$NPROC"
    make install
  else
    log "libgpod already built, skipping"
  fi

  log "macOS static dependencies built to $STATIC_DEPS_DIR"

# ---------------------------------------------------------------------------
# Linux: install dev packages and build libgpod from source as static
# ---------------------------------------------------------------------------
elif [ "$OS" = "Linux" ]; then
  # On Linux CI, we install system -dev packages for glib/gdk-pixbuf and
  # build libgpod from source. System static libs are used where available.

  log "Installing system dependencies..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq \
      build-essential pkg-config \
      libglib2.0-dev libgdk-pixbuf-2.0-dev \
      libplist-dev libffi-dev libsqlite3-dev \
      libpng-dev libjpeg-dev libtiff-dev \
      autoconf automake libtool intltool gtk-doc-tools \
      curl
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y \
      gcc gcc-c++ make pkg-config \
      glib2-devel gdk-pixbuf2-devel \
      libplist-devel libffi-devel \
      libpng-devel libjpeg-turbo-devel libtiff-devel \
      autoconf automake libtool intltool gtk-doc \
      curl
  fi

  # Copy system static libs to our prefix
  log "Collecting static libraries..."
  for lib in libglib-2.0.a libgobject-2.0.a libgio-2.0.a libgmodule-2.0.a \
             libgdk_pixbuf-2.0.a libffi.a libpcre2-8.a libplist-2.0.a \
             libpng16.a libjpeg.a libtiff.a libz.a; do
    found=$(find /usr/lib /usr/lib64 /usr/local/lib -name "$lib" 2>/dev/null | head -1)
    if [ -n "$found" ]; then
      cp "$found" "$STATIC_DEPS_DIR/lib/"
    fi
  done

  # Copy intl if available
  found=$(find /usr/lib /usr/lib64 /usr/local/lib -name "libintl.a" 2>/dev/null | head -1)
  if [ -n "$found" ]; then
    cp "$found" "$STATIC_DEPS_DIR/lib/"
  fi

  # Copy headers
  for dir in /usr/include/glib-2.0 /usr/include/gdk-pixbuf-2.0 /usr/include/gpod-1.0; do
    [ -d "$dir" ] && cp -R "$dir" "$STATIC_DEPS_DIR/include/"
  done
  # GLib internal config header
  GLIB_INTERNAL=$(find /usr/lib /usr/lib64 -path "*/glib-2.0/include" 2>/dev/null | head -1)
  if [ -n "$GLIB_INTERNAL" ]; then
    mkdir -p "$STATIC_DEPS_DIR/lib/glib-2.0"
    cp -R "$GLIB_INTERNAL" "$STATIC_DEPS_DIR/lib/glib-2.0/"
  fi

  # Copy pkg-config files
  for pc in glib-2.0.pc gobject-2.0.pc gio-2.0.pc gdk-pixbuf-2.0.pc; do
    found=$(find /usr/lib /usr/lib64 /usr/share -path "*pkgconfig/$pc" 2>/dev/null | head -1)
    [ -n "$found" ] && cp "$found" "$STATIC_DEPS_DIR/lib/pkgconfig/"
  done

  # Build libgpod from source as static
  if [ ! -f "$STATIC_DEPS_DIR/lib/libgpod.a" ]; then
    log "Building libgpod from source (static)..."
    cd "$WORK_DIR"

    LIBGPOD_VERSION="0.8.3"
    LIBGPOD_URL="https://downloads.sourceforge.net/project/gtkpod/libgpod/libgpod-0.8/libgpod-${LIBGPOD_VERSION}.tar.bz2"

    if [ ! -f "libgpod-${LIBGPOD_VERSION}.tar.bz2" ]; then
      curl -L -o "libgpod-${LIBGPOD_VERSION}.tar.bz2" "$LIBGPOD_URL"
    fi

    rm -rf "libgpod-${LIBGPOD_VERSION}"
    tar -xjf "libgpod-${LIBGPOD_VERSION}.tar.bz2"
    cd "libgpod-${LIBGPOD_VERSION}"

    # Download and apply patches
    curl -sL -o callout.patch "https://raw.githubusercontent.com/macports/macports-ports/master/multimedia/libgpod/files/patch-tools-generic-callout.c.diff"
    curl -sL -o libplist.patch "https://raw.githubusercontent.com/pld-linux/libgpod/master/libgpod-libplist.patch"
    patch -p0 < callout.patch || true
    patch -p1 < libplist.patch || true

    export PKG_CONFIG_PATH="$STATIC_DEPS_DIR/lib/pkgconfig:$PKG_CONFIG_PATH"

    autoreconf -fi
    ./configure \
      --prefix="$STATIC_DEPS_DIR" \
      --enable-static \
      --disable-shared \
      --disable-more-warnings \
      --disable-silent-rules \
      --disable-udev \
      --disable-pygobject \
      --with-python=no \
      --without-hal
    make -j"$NPROC"
    make install
  else
    log "libgpod already built, skipping"
  fi

  log "Linux static dependencies built to $STATIC_DEPS_DIR"
fi

# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------
log "Verifying static dependencies..."
MISSING=""
for lib in libgpod.a libglib-2.0.a libgobject-2.0.a libgdk_pixbuf-2.0.a; do
  if [ ! -f "$STATIC_DEPS_DIR/lib/$lib" ]; then
    MISSING="$MISSING $lib"
  fi
done

if [ -n "$MISSING" ]; then
  log "ERROR: Missing static libraries:$MISSING"
  exit 1
fi

log "All required static libraries present in $STATIC_DEPS_DIR/lib/"
ls -la "$STATIC_DEPS_DIR/lib/"*.a
