#!/bin/sh
# Install the slackwater CLI.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/openwatersio/slackwater/main/install.sh | sh
#
# Environment variables:
#   SLACKWATER_VERSION     - version to install (default: latest)
#   SLACKWATER_INSTALL_DIR - installation directory (default: /usr/local/bin)

set -e

REPO="openwatersio/slackwater"
INSTALL_DIR="${SLACKWATER_INSTALL_DIR:-/usr/local/bin}"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux)  os="linux" ;;
  Darwin) os="darwin" ;;
  *)      echo "Error: unsupported OS: $OS" >&2; exit 1 ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)        arch="x64" ;;
  aarch64|arm64) arch="arm64" ;;
  *)             echo "Error: unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

TARGET="${os}-${arch}"

# Only linux-x64 and darwin-arm64 binaries are available
if [ "$TARGET" != "linux-x64" ] && [ "$TARGET" != "darwin-arm64" ]; then
  echo "Error: no pre-built binary for ${TARGET}." >&2
  echo "Install via npm instead: npm install -g @slackwater/cli" >&2
  exit 1
fi

# Resolve version
if [ -z "$SLACKWATER_VERSION" ]; then
  SLACKWATER_VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
fi

if [ -z "$SLACKWATER_VERSION" ]; then
  echo "Error: could not determine latest version." >&2
  exit 1
fi

ARCHIVE="slackwater-${TARGET}.tar.gz"
BASE_URL="https://github.com/${REPO}/releases/download/${SLACKWATER_VERSION}"

echo "Installing slackwater ${SLACKWATER_VERSION} (${TARGET})..."

# Download archive and checksums
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL "${BASE_URL}/${ARCHIVE}" -o "${TMPDIR}/${ARCHIVE}"
curl -fsSL "${BASE_URL}/checksums.txt" -o "${TMPDIR}/checksums.txt"

# Verify checksum
EXPECTED=$(grep "${ARCHIVE}" "${TMPDIR}/checksums.txt" | cut -d' ' -f1)

if [ -z "$EXPECTED" ]; then
  echo "Error: no checksum found for ${ARCHIVE}" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "${TMPDIR}/${ARCHIVE}" | cut -d' ' -f1)
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL=$(shasum -a 256 "${TMPDIR}/${ARCHIVE}" | cut -d' ' -f1)
else
  echo "Error: no sha256sum or shasum command found" >&2
  exit 1
fi

if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "Error: checksum verification failed" >&2
  echo "  expected: ${EXPECTED}" >&2
  echo "  got:      ${ACTUAL}" >&2
  exit 1
fi

# Extract
tar xzf "${TMPDIR}/${ARCHIVE}" -C "$TMPDIR"

# Install
if [ -w "$INSTALL_DIR" ]; then
  mv "${TMPDIR}/slackwater" "${INSTALL_DIR}/slackwater"
else
  echo "Writing to ${INSTALL_DIR} requires elevated permissions."
  sudo mv "${TMPDIR}/slackwater" "${INSTALL_DIR}/slackwater"
fi

chmod +x "${INSTALL_DIR}/slackwater"

echo "Installed slackwater to ${INSTALL_DIR}/slackwater"
