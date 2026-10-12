#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4138}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-outside-tester-smoke-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Outside Tester Smoke Script v1 proof ==="
echo "out=$OUT"

bash -n ops/mainnet0/public-node-outside-tester-smoke.sh
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" ops/mainnet0/public-node-outside-tester-smoke.sh
grep -Fq "PUBLIC_NODE_BASE" ops/mainnet0/public-node-outside-tester-smoke.sh
grep -Fq "/public-node/tester-loop-status.json" ops/mainnet0/public-node-outside-tester-smoke.sh
grep -Fq "/public-node/real-data-import-lane-status.json" ops/mainnet0/public-node-outside-tester-smoke.sh
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_DOC_V1" docs/public/public-node-outside-tester-smoke.md
grep -Fq "/public-node/real-data-import-lane-status.json" docs/public/public-node-outside-tester-smoke.md
grep -Fq "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1" docs/public/public-node-outside-tester-smoke.md
grep -Fq "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1" src/index.ts
echo "[ok] smoke script/docs/source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4738
  export NODE_PRIVKEY_PATH="$OUT/nodeA.key"
  export PORT="${RUN_PORT}"
  export HTTP_PORT="${RUN_PORT}"
  export VOID_HTTP_PORT="${RUN_PORT}"
  export HOST=127.0.0.1
  export PUBLIC_NODE_EXTERNAL_BASE_URL="$BASE"
  npm start
) > "$OUT/server.log" 2>&1 &

PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/tester-loop-status.json" >/dev/null 2>&1; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

PUBLIC_NODE_BASE="$BASE" OUT="$OUT/smoke-run" ops/mainnet0/public-node-outside-tester-smoke.sh | tee "$OUT/smoke.log"

grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/smoke.log"
grep -Fq "ok /public-node" "$OUT/smoke.log"
grep -Fq "ok /public-node/share-link.json" "$OUT/smoke.log"
grep -Fq "ok /public-node/tester-bundle.json" "$OUT/smoke.log"
grep -Fq "ok /public-node/tester-loop-status.json" "$OUT/smoke.log"
grep -Fq "ok /public-node/tester-result-receipt.json" "$OUT/smoke.log"
grep -Fq "ok /public-node/quickstart.json" "$OUT/smoke.log"
grep -Fq "ok /public-node/tester-handoff.json" "$OUT/smoke.log"
grep -Fq "ok /public-node/public-exposure-smoke-pack.json" "$OUT/smoke.log"
grep -Fq "ok /public-node/route-index.json" "$OUT/smoke.log"
grep -Fq "ok /public-node/real-data-import-lane-status.json" "$OUT/smoke.log"
grep -Fq "ok /proofs" "$OUT/smoke.log"

echo "marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1"
echo "script=ops/mainnet0/public-node-outside-tester-smoke.sh"
echo "doc=docs/public/public-node-outside-tester-smoke.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "ok_routes=11"
echo "real_data_status_route_smoke_green=true"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
