#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-share-pack-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Share Pack v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SHARE_PACK_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SHARE_PACK_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SHARE_PACK_UI_V1" src/index.ts
grep -Fq "/public-node/share-pack.json" src/index.ts
grep -Fq "VOID public node is online" src/index.ts
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

PORT=4100 VOID_HTTP_PORT=4100 HOST=127.0.0.1 node dist/index.js > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 80); do
  if curl --max-time 10 -fsS "$BASE/public-node/share-pack.json" > "$OUT/share-pack.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"

node - "$OUT/share-pack.json" <<'NODE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function ok(x,msg){ if(!x){ console.error("[fail]",msg); process.exit(1); } }
ok(j.marker === "VOID_PUBLIC_NODE_SHARE_PACK_V1", "marker");
ok(j.purpose === "public_node_share_pack", "purpose");
ok(j.headline === "VOID public node is online", "headline");
ok(Array.isArray(j.public_routes), "public_routes array");
for (const r of ["/public-node","/public-node/share-pack.json","/public-node/client-work-pack.json","/public-node/ai-readiness.json","/public-node/fresh-proof-seed.json","/public-node/requester-work-policy.json","/proofs"]) {
  ok(j.public_routes.includes(r), "missing route "+r);
}
ok(j.share_text.short.includes("VOID public node is online"), "short share text");
ok(j.share_text.tester.includes("Use public routes only"), "tester share text");
ok(j.policy.public_routes_only === true, "public routes only");
ok(j.policy.owner_routes === false, "owner routes false");
ok(j.policy.private_api === false, "private api false");
ok(j.policy.mutation === false, "mutation false");
ok(j.policy.read_only === true, "read only true");
ok(j.policy.money_movement === false, "money false");
ok(j.policy.wallet_send === false, "wallet false");
ok(j.policy.wc_to_void_swap === false, "swap false");
ok(j.policy.buy_void_fulfillment === false, "fulfillment false");
ok(j.policy.validator_mutation === false, "validator false");
console.log("[ok] json share pack");
NODE

grep -Fq "VOID_PUBLIC_NODE_SHARE_PACK_UI_V1" "$OUT/public-node.html"
grep -Fq "Share pack" "$OUT/public-node.html"
grep -Fq "/public-node/share-pack.json" "$OUT/public-node.html"
grep -Fq "One clean public payload for testers and agents" "$OUT/public-node.html"

if grep -Fq "<form" "$OUT/public-node.html"; then echo "[fail] form exposed"; exit 1; fi
if grep -Fq "/__void/participant" "$OUT/public-node.html"; then echo "[fail] private api exposed"; exit 1; fi
if grep -Fq "/__void/buy-void" "$OUT/public-node.html"; then echo "[fail] buy api exposed"; exit 1; fi
if grep -Fq "/wc-proof-demo/generate" "$OUT/public-node.html"; then echo "[fail] proof mutation exposed"; exit 1; fi

echo "marker=VOID_PUBLIC_NODE_SHARE_PACK_V1"
echo "route=/public-node/share-pack.json"
echo "ui_marker=VOID_PUBLIC_NODE_SHARE_PACK_UI_V1"
echo "public_routes_only=true"
echo "share_pack_mutation=false"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_SHARE_PACK_V1_GREEN"
