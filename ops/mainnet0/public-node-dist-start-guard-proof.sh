#!/usr/bin/env bash
set -euo pipefail
RUN_PORT="${RUN_PORT:-4128}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-dist-start-guard-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Dist Start Guard v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_DIST_START_ESM_IMPORT_GUARD_V1" src/index.ts
grep -Fq 'import "./http/participant_wallet_native_v1.js"' src/index.ts
echo "[ok] source import guard"

npm run build
timeout 20s node -e 'import("./dist/http/participant_wallet_native_v1.js").then(()=>{ console.log("[ok] dist side-effect import resolves"); process.exit(0); }).catch((e)=>{ console.error(e); process.exit(1); })'
echo "[ok] build/import"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

DATA_DIR="$OUT/data" P2P_PORT=4728 NODE_PRIVKEY_PATH="$OUT/nodeA.key" PORT="${RUN_PORT}" HTTP_PORT="${RUN_PORT}" VOID_HTTP_PORT="${RUN_PORT}" HOST=127.0.0.1 PUBLIC_NODE_EXTERNAL_BASE_URL="https://example.void.test" node dist/index.js > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json" 2>/dev/null; then
    echo "[ok] dist server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_ROUTE_INDEX_V1" "$OUT/route-index.json"
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_UI_V1" "$OUT/public-node.html"

echo "marker=VOID_DIST_START_ESM_IMPORT_GUARD_V1"
echo "dist_start=true"
echo "route=/public-node/route-index.json"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_DIST_START_GUARD_V1_GREEN"
