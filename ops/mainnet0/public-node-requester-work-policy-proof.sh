#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-requester-work-policy-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Requester Work Policy v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_REQUESTER_WORK_POLICY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_REQUESTER_WORK_POLICY_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_REQUESTER_WORK_POLICY_UI_V1" src/index.ts
grep -Fq "requester_cpu_not_network_paid" src/index.ts
grep -Fq "pay_nodes_for_hosted_served_network_value" src/index.ts
echo "[ok] source markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

PORT=4100 VOID_HTTP_PORT=4100 HOST=127.0.0.1 node dist/index.js > "$OUT/server.log" 2>&1 &
PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 80); do
  if curl --max-time 10 -fsS "$BASE/public-node/requester-work-policy.json" > "$OUT/requester-work-policy.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl --max-time 15 -fsS "$BASE/public-node" > "$OUT/public-node.html"

node - "$OUT/requester-work-policy.json" <<'NODE'
const fs = require("fs");
const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
function ok(x,m){ if(!x) throw new Error(m); }
ok(j.ok === true, "ok");
ok(j.marker === "VOID_PUBLIC_NODE_REQUESTER_WORK_POLICY_V1", "marker");
ok(j.requester_work_default === true, "default");
ok(j.node_serves.includes("proofs"), "proofs");
ok(j.node_serves.includes("chunks"), "chunks");
ok(j.node_serves.includes("manifests"), "manifests");
ok(j.node_serves.includes("minimal_indexes"), "indexes");
ok(j.node_serves.includes("bounded_summaries"), "summaries");
ok(j.requester_does.includes("verification"), "verify");
ok(j.requester_does.includes("decompression"), "decompress");
ok(j.requester_does.includes("filtering"), "filter");
ok(j.requester_does.includes("ranking"), "rank");
ok(j.requester_does.includes("caching"), "cache");
ok(j.requester_does.includes("retries"), "retry");
ok(j.compensation.pay_nodes_for_hosted_served_network_value === true, "pay nodes");
ok(j.compensation.requester_cpu_not_network_paid === true, "cpu unpaid");
ok(j.compensation.do_not_pay_viewer_cpu === true, "no viewer cpu pay");
ok(j.policy.bounded_server_cpu === true, "bounded cpu");
ok(j.policy.mutation === false, "no mutation");
ok(j.safety.read_only === true, "read only");
ok(j.safety.money_movement === false, "no money");
ok(j.safety.wallet_send === false, "no wallet");
ok(j.safety.wc_to_void_swap === false, "no swap");
ok(j.safety.buy_void_fulfillment === false, "no buy");
ok(j.safety.validator_mutation === false, "no validator");
console.log("requester_work_default=" + j.requester_work_default);
console.log("bounded_server_cpu=" + j.policy.bounded_server_cpu);
console.log("requester_cpu_not_network_paid=" + j.compensation.requester_cpu_not_network_paid);
console.log("pay_nodes_for_hosted_served_network_value=" + j.compensation.pay_nodes_for_hosted_served_network_value);
NODE

grep -Fq "VOID_PUBLIC_NODE_REQUESTER_WORK_POLICY_UI_V1" "$OUT/public-node.html"
grep -Fq "Requester work policy" "$OUT/public-node.html"
grep -Fq "Requester CPU is not network-paid" "$OUT/public-node.html"

if grep -Fq "$(pwd)" "$OUT/requester-work-policy.json"; then echo "[fail] cwd path exposed"; exit 1; fi
if grep -Fq "$HOME" "$OUT/requester-work-policy.json"; then echo "[fail] home path exposed"; exit 1; fi
if grep -Fq "file://" "$OUT/requester-work-policy.json"; then echo "[fail] file url exposed"; exit 1; fi
if grep -Fq "<form" "$OUT/public-node.html"; then echo "[fail] form exposed"; exit 1; fi
if grep -Fq "/__void/participant" "$OUT/public-node.html"; then echo "[fail] private api exposed"; exit 1; fi
if grep -Fq "/__void/buy-void" "$OUT/public-node.html"; then echo "[fail] buy api exposed"; exit 1; fi

echo "route=/public-node/requester-work-policy.json"
echo "marker=VOID_PUBLIC_NODE_REQUESTER_WORK_POLICY_V1"
echo "requester_work_default=true"
echo "bounded_server_cpu=true"
echo "requester_cpu_not_network_paid=true"
echo "pay_nodes_for_hosted_served_network_value=true"
echo "requester_work_policy_mutation=false"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_REQUESTER_WORK_POLICY_V1_GREEN"
