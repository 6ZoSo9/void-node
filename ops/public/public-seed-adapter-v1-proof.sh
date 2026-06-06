#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID public seed adapter v1 proof ==="

node --check ops/public/public-seed-adapter-v1.mjs

OUT="/tmp/void-public-seed-adapter-v1-proof"
LOG="$OUT/adapter.log"
PID="$OUT/adapter.pid"
mkdir -p "$OUT"

VOID_SEED_UPSTREAM="${VOID_SEED_UPSTREAM:-http://100.122.79.39:4100}" \
VOID_ADAPTER_HOST=127.0.0.1 \
VOID_ADAPTER_PORT=4111 \
node ops/public/public-seed-adapter-v1.mjs >"$LOG" 2>&1 &

echo $! > "$PID"
trap 'kill "$(cat "$PID")" 2>/dev/null || true' EXIT

sleep 1
cat "$LOG"

curl -fsS --max-time 8 http://127.0.0.1:4111/__void/ready.json | grep -Fq '"ready":true'

RPC_CODE="$(curl -sS -o "$OUT/rpc.out" -w "%{http_code}" --max-time 8 http://127.0.0.1:4111/rpc)"
test "$RPC_CODE" = "404"
grep -Fq "not_public" "$OUT/rpc.out"

echo "[ok] adapter allowed public ready route"
echo "[ok] adapter blocked private rpc route"
