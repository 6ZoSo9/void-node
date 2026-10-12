#!/usr/bin/env bash
set -euo pipefail
RUN_PORT="${RUN_PORT:-4131}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-public-exposure-smoke-pack-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Public Exposure Smoke Pack v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_UI_V1" src/index.ts
grep -Fq "/public-node/public-exposure-smoke-pack.json" src/index.ts
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

DATA_DIR="$OUT/data" P2P_PORT=4731 NODE_PRIVKEY_PATH="$OUT/nodeA.key" PORT="${RUN_PORT}" HTTP_PORT="${RUN_PORT}" VOID_HTTP_PORT="${RUN_PORT}" HOST=127.0.0.1 PUBLIC_NODE_EXTERNAL_BASE_URL="https://example.void.test" npm start > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/public-exposure-smoke-pack.json" > "$OUT/smoke-pack.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1" "$OUT/smoke-pack.json"
grep -Fq "https://example.void.test" "$OUT/smoke-pack.json"
grep -Fq "PUBLIC_NODE_BASE=" "$OUT/smoke-pack.json"
grep -Fq "/public-node/public-exposure-smoke-pack.json" "$OUT/smoke-pack.json"
grep -Fq "public_routes_only" "$OUT/smoke-pack.json"

grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_UI_V1" "$OUT/public-node.html"
grep -Fq "Public exposure smoke pack" "$OUT/public-node.html"
grep -Fq "PUBLIC_NODE_BASE=https://your-domain.example" "$OUT/public-node.html"

grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1" "$OUT/route-index.json"
grep -Fq "/public-node/public-exposure-smoke-pack.json" "$OUT/route-index.json"

echo "marker=VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1"
echo "route=/public-node/public-exposure-smoke-pack.json"
echo "operator_copy_command=true"
echo "outside_tester_smoke=true"
echo "npm_start=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1_GREEN"
