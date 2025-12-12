#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${WC_HTTP_PORT:-4312}"

ADDR="${1:-${WC_DEMO_ADDRESS:-0x1111111111111111111111111111111111111111}}"

echo "=== [cfg] workcredits dashboard demo ==="
echo "  ROOT = $ROOT"
echo "  PORT = $PORT"
echo "  ADDR = $ADDR"
echo

# Kill any existing helper on this port
echo "=== [kill existing helper on $PORT if any] ==="
PIDS="$(lsof -ti:"$PORT" 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "[info] killing PIDs: $PIDS"
  kill $PIDS || true
  sleep 1
else
  echo "[info] no existing helper on $PORT"
fi
echo

# Start helper
echo "=== [start helper on $PORT] ==="
WC_HTTP_PORT="$PORT" node "$ROOT/ops/void-workcredits-devnet-http.cjs" \
  > /tmp/void-workcredits-http-dashboard.log 2>&1 &
WC_PID=$!
echo "[info] helper PID=$WC_PID"
sleep 2
echo

BASE="http://127.0.0.1:$PORT"

echo "=== [raw dashboard JSON] ==="
curl -fsS "$BASE/workcredits/devnet/dashboard/$ADDR.json" | jq .
echo

echo "=== [wallet-friendly summary] ==="
curl -fsS "$BASE/workcredits/devnet/dashboard/$ADDR.json" \
  | jq '{
      chain,
      address,
      price: {
        wc_per_void: .pool.price.wc_per_void,
        void_per_wc: .pool.price.void_per_wc
      },
      pool_reserves: {
        void: .pool.reserves.void,
        wc: .pool.reserves.wc
      },
      balances: .account.balances,
      pending_wc: .account.earnings.pending_wc
    }'
echo

echo "=== [helper logs tail] ==="
tail -n 40 /tmp/void-workcredits-http-dashboard.log || true
echo

echo "=== [cleanup helper] ==="
kill "$WC_PID" 2>/dev/null || true
