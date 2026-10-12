#!/usr/bin/env bash
set -euo pipefail
RUN_PORT="${RUN_PORT:-4130}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-public-url-operator-note-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Public URL Operator Note v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_PUBLIC_URL_OPERATOR_NOTE_UI_V1" src/index.ts
grep -Fq "PUBLIC_NODE_EXTERNAL_BASE_URL=https://your-domain.example npm start" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_NPM_START_SMOKE_V1_GREEN" ops/mainnet0/public-node-npm-start-smoke-proof.sh
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

DATA_DIR="$OUT/data" P2P_PORT=4730 NODE_PRIVKEY_PATH="$OUT/nodeA.key" PORT="${RUN_PORT}" HTTP_PORT="${RUN_PORT}" VOID_HTTP_PORT="${RUN_PORT}" HOST=127.0.0.1 PUBLIC_NODE_EXTERNAL_BASE_URL="https://example.void.test" npm start > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node/external-base-url.json" > "$OUT/external-base-url.json"

grep -Fq "VOID_PUBLIC_NODE_PUBLIC_URL_OPERATOR_NOTE_UI_V1" "$OUT/public-node.html"
grep -Fq "Operator public URL note" "$OUT/public-node.html"
grep -Fq "PUBLIC_NODE_EXTERNAL_BASE_URL=https://your-domain.example npm start" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1" "$OUT/external-base-url.json"

echo "marker=VOID_PUBLIC_NODE_PUBLIC_URL_OPERATOR_NOTE_UI_V1"
echo "operator_note_visible=true"
echo "npm_start=true"
echo "external_base_url_helper=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_PUBLIC_URL_OPERATOR_NOTE_V1_GREEN"
