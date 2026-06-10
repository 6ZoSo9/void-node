#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-route-index-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Route Index v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_ROUTE_INDEX_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_ROUTE_INDEX_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_ROUTE_INDEX_UI_V1" src/index.ts
grep -Fq "/public-node/route-index.json" src/index.ts
grep -Fq "Machine-readable registry of public routes" src/index.ts
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

PORT=4100 VOID_HTTP_PORT=4100 HOST=127.0.0.1 node dist/index.js > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 80); do
  if curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"

node - "$OUT/route-index.json" <<'NODE'
const fs = require("fs");
const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
function ok(x,msg){ if(!x){ console.error("[fail]",msg); process.exit(1); } }
ok(j.marker === "VOID_PUBLIC_NODE_ROUTE_INDEX_V1", "marker");
ok(j.purpose === "public_node_route_index", "purpose");
ok(Array.isArray(j.routes), "routes array");
for (const r of ["/public-node","/public-node/route-index.json","/public-node/share-pack.json","/public-node/tester-checklist.json","/public-node/client-work-pack.json","/public-node/ai-readiness.json","/public-node/fresh-proof-seed.json","/public-node/requester-work-policy.json","/public-node/data-quality.json","/public-node/link-health.json","/public-node/intelligence.json","/proofs"]) {
  ok(j.routes.some(x => x.path === r), "missing route "+r);
}
ok(j.policy.public_routes_only === true, "public routes only");
ok(j.policy.private_api === false, "private api false");
ok(j.policy.mutation === false, "mutation false");
ok(j.policy.read_only === true, "read only true");
ok(j.policy.money_movement === false, "money false");
ok(j.policy.wallet_send === false, "wallet false");
ok(j.policy.wc_to_void_swap === false, "swap false");
ok(j.policy.buy_void_fulfillment === false, "fulfillment false");
ok(j.policy.validator_mutation === false, "validator false");
console.log("[ok] json route index");
NODE

grep -Fq "VOID_PUBLIC_NODE_ROUTE_INDEX_UI_V1" "$OUT/public-node.html"
grep -Fq "Route index" "$OUT/public-node.html"
grep -Fq "/public-node/route-index.json" "$OUT/public-node.html"
grep -Fq "without touching private APIs" "$OUT/public-node.html"

if grep -Fq "<form" "$OUT/public-node.html"; then echo "[fail] form exposed"; exit 1; fi
if grep -Fq "/__void/participant" "$OUT/public-node.html"; then echo "[fail] private api exposed"; exit 1; fi
if grep -Fq "/__void/buy-void" "$OUT/public-node.html"; then echo "[fail] buy api exposed"; exit 1; fi
if grep -Fq "/wc-proof-demo/generate" "$OUT/public-node.html"; then echo "[fail] proof mutation exposed"; exit 1; fi

echo "marker=VOID_PUBLIC_NODE_ROUTE_INDEX_V1"
echo "route=/public-node/route-index.json"
echo "ui_marker=VOID_PUBLIC_NODE_ROUTE_INDEX_UI_V1"
echo "public_routes_only=true"
echo "route_index_mutation=false"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_ROUTE_INDEX_V1_GREEN"
