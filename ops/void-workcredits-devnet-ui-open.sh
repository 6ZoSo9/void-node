#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PORT="${WC_HTTP_PORT:-4312}"

cd "$ROOT"

echo "=== [workcredits devnet UI helper] ==="
echo "ROOT = $ROOT"
echo "PORT = $PORT"

if ! pgrep -f "ops/void-workcredits-devnet-http.cjs" >/dev/null 2>&1; then
  echo "[info] no helper detected, starting one..."
  WC_HTTP_PORT="$PORT" ./ops/void-workcredits-devnet-http.sh \
    >/tmp/void-workcredits-devnet-http.log 2>&1 &
  PID=$!
  echo "[info] helper PID=$PID (logs: /tmp/void-workcredits-devnet-http.log)"
else
  echo "[info] helper already running (pgrep match)."
fi

URL="http://127.0.0.1:${PORT}/workcredits/devnet/ui"
echo
echo "=== [open] $URL ==="
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || echo "[warn] xdg-open failed; open URL manually."
else
  echo "[info] xdg-open not present; open URL manually."
fi
