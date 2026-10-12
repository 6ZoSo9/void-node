#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${HOME}/.local/bin"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"

mkdir -p "$BIN_DIR" "$APP_DIR"

install -m 0755 "$SRC_DIR/void-launcher.sh" "$BIN_DIR/void-launcher"

cat > "$APP_DIR/void-network.desktop" <<DESKTOP_EOF
[Desktop Entry]
Type=Application
Name=VOID Network
Comment=Start the local VOID node and open the participant app
Exec=$BIN_DIR/void-launcher
Icon=network-workgroup
Terminal=false
Categories=Network;Utility;
StartupNotify=true
DESKTOP_EOF

chmod 0755 "$APP_DIR/void-network.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APP_DIR" >/dev/null 2>&1 || true
fi

echo "[ok] installed VOID desktop launcher"
echo "launcher=$BIN_DIR/void-launcher"
echo "desktop=$APP_DIR/void-network.desktop"
