#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-tester-smoke-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node One-Command Tester Smoke v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_TESTER_SMOKE_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_SMOKE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_SMOKE_UI_V1" src/index.ts
grep -Fq "/public-node/tester-smoke.json" src/index.ts
grep -Fq "One-command tester smoke" src/index.ts
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

PORT=4100 VOID_HTTP_PORT=4100 HOST=127.0.0.1 node dist/index.js > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 80); do
  if curl --max-time 10 -fsS "$BASE/public-node/tester-smoke.json" > "$OUT/tester-smoke.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"

node - "$OUT/tester-smoke.json" <<'NODE'
const fs = require("fs");
const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
function ok(x,msg){ if(!x){ console.error("[fail]",msg); process.exit(1); } }
ok(j.marker === "VOID_PUBLIC_NODE_TESTER_SMOKE_V1", "marker");
ok(j.purpose === "public_node_one_command_tester_smoke", "purpose");
ok(j.smoke_command.includes("PUBLIC_NODE_BASE"), "PUBLIC_NODE_BASE");
ok(j.smoke_command.includes("/public-node/route-index.json"), "route index in command");
ok(j.smoke_command.includes("/public-node/share-pack.json"), "share pack in command");
ok(j.smoke_command.includes("/public-node/tester-checklist.json"), "checklist in command");
ok(j.smoke_command.includes("/public-node/client-work-pack.json"), "client work pack in command");
ok(j.smoke_command.includes("/public-node/ai-readiness.json"), "ai readiness in command");
ok(j.smoke_command.includes("/proofs"), "proofs in command");
for (const r of ["/public-node/route-index.json","/public-node/share-pack.json","/public-node/tester-checklist.json","/public-node/client-work-pack.json","/public-node/ai-readiness.json","/proofs"]) {
  ok(j.checks.includes(r), "missing check "+r);
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
console.log("[ok] json tester smoke");
NODE

grep -Fq "VOID_PUBLIC_NODE_TESTER_SMOKE_UI_V1" "$OUT/public-node.html"
grep -Fq "One-command tester smoke" "$OUT/public-node.html"
grep -Fq "/public-node/route-index.json" "$OUT/public-node.html"
grep -Fq "/public-node/share-pack.json" "$OUT/public-node.html"
grep -Fq "/public-node/tester-checklist.json" "$OUT/public-node.html"
grep -Fq "/public-node/client-work-pack.json" "$OUT/public-node.html"
grep -Fq "/public-node/ai-readiness.json" "$OUT/public-node.html"
grep -Fq "/proofs" "$OUT/public-node.html"

if grep -Fq "<form" "$OUT/public-node.html"; then echo "[fail] form exposed"; exit 1; fi
if grep -Fq "/__void/participant" "$OUT/public-node.html"; then echo "[fail] private api exposed"; exit 1; fi
if grep -Fq "/__void/buy-void" "$OUT/public-node.html"; then echo "[fail] buy api exposed"; exit 1; fi
if grep -Fq "/wc-proof-demo/generate" "$OUT/public-node.html"; then echo "[fail] proof mutation exposed"; exit 1; fi

echo "marker=VOID_PUBLIC_NODE_TESTER_SMOKE_V1"
echo "route=/public-node/tester-smoke.json"
echo "ui_marker=VOID_PUBLIC_NODE_TESTER_SMOKE_UI_V1"
echo "public_routes_only=true"
echo "tester_smoke_mutation=false"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_TESTER_SMOKE_V1_GREEN"
