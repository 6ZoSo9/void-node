#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== VOID Linux desktop launcher proof ==="

bash -n ops/desktop-linux/void-launcher.sh
bash -n ops/desktop-linux/install-void-desktop-launcher.sh
echo "[ok] syntax"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/bin" "$TMP/home"

cat > "$TMP/bin/systemctl" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "--user" ] && [ "${2:-}" = "list-unit-files" ]; then
  echo "void-node.service enabled"
  exit 0
fi
if [ "${1:-}" = "--user" ] && [ "${2:-}" = "start" ]; then
  echo "[fake-systemctl] started ${3:-}"
  exit 0
fi
if [ "${1:-}" = "--user" ] && [ "${2:-}" = "--no-pager" ] && [ "${3:-}" = "status" ]; then
  echo "[fake-systemctl] status ${4:-}"
  exit 0
fi
echo "[fake-systemctl] unsupported: $*" >&2
exit 2
SH
chmod +x "$TMP/bin/systemctl"

cat > "$TMP/bin/curl" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
cat <<JSON
{"ready":true,"head":1,"lastmile_seen":1,"gap":0,"txroot_live":1,"reasons":[]}
JSON
SH
chmod +x "$TMP/bin/curl"

cat > "$TMP/bin/xdg-open" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
echo "[fake-xdg-open] $*"
SH
chmod +x "$TMP/bin/xdg-open"

cat > "$TMP/bin/notify-send" <<'SH'
#!/usr/bin/env bash
exit 0
SH
chmod +x "$TMP/bin/notify-send"

echo
echo "=== [1] installer dry proof ==="
PATH="$TMP/bin:$PATH" \
HOME="$TMP/home" \
XDG_DATA_HOME="$TMP/home/.local/share" \
bash ops/desktop-linux/install-void-desktop-launcher.sh

test -x "$TMP/home/.local/bin/void-launcher"
test -f "$TMP/home/.local/share/applications/void-network.desktop"

grep -q '^Name=VOID Network$' "$TMP/home/.local/share/applications/void-network.desktop"
grep -q 'void-launcher' "$TMP/home/.local/share/applications/void-network.desktop"
grep -q '^Terminal=false$' "$TMP/home/.local/share/applications/void-network.desktop"

echo "[ok] installer wrote launcher and desktop entry"

echo
echo "=== [2] launcher dry proof ==="
PATH="$TMP/bin:$PATH" \
HOME="$TMP/home" \
XDG_STATE_HOME="$TMP/home/.local/state" \
VOID_LAUNCHER_NO_OPEN=1 \
VOID_READY_TIMEOUT_SECONDS=5 \
"$TMP/home/.local/bin/void-launcher"

grep -q '\[ok\] VOID ready' "$TMP/home/.local/state/void/launcher.log"

echo
echo "[ok] VOID Linux desktop launcher proof passed"
