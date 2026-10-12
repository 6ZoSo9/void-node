#!/usr/bin/env bash
set -euo pipefail
RUN_PORT="${RUN_PORT:-4127}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-external-base-url-v1-proof-$STAMP"
mkdir -p "$OUT"
mkdir -p "$OUT/data"
openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node External Base URL v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_UI_V1" src/index.ts
grep -Fq "/public-node/external-base-url.json" src/index.ts
grep -Fq "PUBLIC_NODE_EXTERNAL_BASE_URL" src/index.ts
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

DATA_DIR="$OUT/data" P2P_PORT=4727 NODE_PRIVKEY_PATH="$OUT/nodeA.key" PORT="${RUN_PORT}" HTTP_PORT="${RUN_PORT}" VOID_HTTP_PORT="${RUN_PORT}" HOST=127.0.0.1 PUBLIC_NODE_EXTERNAL_BASE_URL="https://example.void.test" ./node_modules/.bin/tsx src/index.ts > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 80); do
  if curl --max-time 10 -fsS "$BASE/public-node/external-base-url.json" > "$OUT/external-base-url.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

node - "$OUT/external-base-url.json" "$OUT/route-index.json" <<'NODE'
const fs = require("fs");
const ext = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
function ok(x,msg){ if(!x){ console.error("[fail]",msg); process.exit(1); } }
ok(ext.marker === "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1", "marker");
ok(ext.default_base_url === "http://127.0.0.1:4100", "default base");
ok(ext.external_base_url === "https://example.void.test", "external base");
ok(ext.effective_base_url === "https://example.void.test", "effective base");
ok(ext.smoke_command.includes('PUBLIC_NODE_BASE="https://example.void.test"'), "smoke command external");
ok(ext.public_routes.includes("/public-node/external-base-url.json"), "public route present");
ok(ext.policy.optional_external_base_url === true, "optional external true");
ok(ext.policy.public_routes_only === true, "public routes only");
ok(ext.policy.private_api === false, "private api false");
ok(ext.policy.mutation === false, "mutation false");
ok(ext.policy.read_only === true, "read only true");
ok(ext.policy.money_movement === false, "money false");
ok(ext.policy.wallet_send === false, "wallet false");
ok(ext.policy.wc_to_void_swap === false, "swap false");
ok(ext.policy.buy_void_fulfillment === false, "fulfillment false");
ok(ext.policy.validator_mutation === false, "validator false");
ok(idx.routes.some(r => r.path === "/public-node/external-base-url.json" && r.marker === "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1"), "route index entry");
console.log("[ok] json external base URL");
NODE

grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_UI_V1" "$OUT/public-node.html"
grep -Fq "External base URL" "$OUT/public-node.html"
grep -Fq "/public-node/external-base-url.json" "$OUT/public-node.html"

echo "marker=VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1"
echo "route=/public-node/external-base-url.json"
echo "ui_marker=VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_UI_V1"
echo "external_base_url=https://example.void.test"
echo "public_routes_only=true"
echo "external_base_url_mutation=false"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1_GREEN"
