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

# WORKCREDITS_DEVNET_HELPER_READY_WAIT_V1
echo
echo "[wait] helper readiness..."
OK=0
for i in $(seq 1 120); do
  if curl -fsS "http://127.0.0.1:$PORT/workcredits/devnet/pool.json" >/dev/null 2>&1; then
    OK=1; break
  fi
  sleep 0.1
done
if [ "$OK" != 1 ]; then
  echo "[FAIL] helper never became ready on :$PORT"
  if command -v ss >/dev/null 2>&1; then
    ss -lntp | (command -v rg >/dev/null 2>&1 && rg ":$PORT" || grep -E ":$PORT") || true
  fi
  if [ -f /tmp/void-workcredits-devnet-http.log ]; then
    echo "=== [tail] /tmp/void-workcredits-devnet-http.log ==="
    tail -n 200 /tmp/void-workcredits-devnet-http.log || true
  fi
  exit 1
fi
echo "[OK] helper is responding"

URL="http://127.0.0.1:${PORT}/workcredits/devnet/ui"
echo
echo "=== [open] $URL ==="
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || echo "[warn] xdg-open failed; open URL manually."
else
  echo "[info] xdg-open not present; open URL manually."
fi
