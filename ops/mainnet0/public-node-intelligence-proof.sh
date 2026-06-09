#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-intelligence-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Intelligence v1 proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"

expect_grep(){
  local name="$1"
  local needle="$2"
  local file="$3"
  if grep -Fq "$needle" "$file"; then
    echo "[ok] $name"
  else
    echo "[fail] $name missing: $needle"
    exit 1
  fi
}

reject_fixed(){
  local name="$1"
  local needle="$2"
  local file="$3"
  if grep -Fq "$needle" "$file"; then
    echo "[fail] $name matched forbidden string: $needle"
    grep -Fn "$needle" "$file" || true
    exit 1
  else
    echo "[ok] $name"
  fi
}

echo
echo "=== [1] source markers/public node intelligence ==="
expect_grep "intelligence route marker" "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_ROUTE_V1" src/index.ts
expect_grep "intelligence marker" "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1" src/index.ts
expect_grep "public node profile preserved" "VOID_PUBLIC_NODE_PROFILE_V1" src/index.ts
expect_grep "boundary preserved" "VOID_PUBLIC_NODE_PRIVATE_BOUNDARY_V1" src/index.ts
expect_grep "route path" "/public-node/intelligence.json" src/index.ts
expect_grep "proof count field" "proof_count" src/index.ts
expect_grep "latest age field" "latest_age_minutes" src/index.ts
expect_grep "seed score field" "public_usefulness_seed_score" src/index.ts
expect_grep "node effectiveness next metric" "node_effectiveness" src/index.ts
expect_grep "compression candidate next metric" "compression_candidate" src/index.ts
echo "[ok] source markers/public node intelligence"

echo
echo "=== [2] build ==="
npm run build
echo "[ok] build passed"

echo
echo "=== [3] start fresh server ==="
PIDS="$(lsof -tiTCP:4100 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "clearing port 4100 pids: $PIDS"
  kill $PIDS 2>/dev/null || true
  sleep 1
fi

PORT=4100 VOID_HTTP_PORT=4100 HOST=127.0.0.1 node dist/index.js > "$OUT/server.log" 2>&1 &
SERVER_PID="$!"
echo "server_pid=$SERVER_PID"

cleanup(){
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 80); do
  if curl -fsS "$BASE/public-node/intelligence.json" > "$OUT/intelligence.wait.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl -fsS "$BASE/public-node/intelligence.json" > "$OUT/intelligence.json"
curl -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$BASE/proofs" > "$OUT/proofs.html"
curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest-twelve.json"

echo
echo "=== [4] intelligence JSON validates ==="
node "$OUT/intelligence.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, "utf8"));

function assert(cond, msg){
  if (!cond) throw new Error(msg);
}
assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1", "marker");
assert(j.route === "/public-node/intelligence.json", "route");
assert(j.data_backing === "DataNet local-job JSON", "data backing");
assert(Number.isFinite(j.proof_count), "proof_count finite");
assert(j.proof_count >= 1, "proof_count >= 1");
assert(j.latest_dataset && /^ds_/.test(j.latest_dataset), "latest_dataset ds_");
assert(j.latest_task, "latest_task");
assert(Number.isFinite(j.latest_age_ms), "latest_age_ms finite");
assert(Number.isFinite(j.latest_age_minutes), "latest_age_minutes finite");
assert(Number.isFinite(j.proofs_with_raw_json), "proofs_with_raw_json finite");
assert(Number.isFinite(j.public_usefulness_seed_score), "seed score finite");
assert(j.public_usefulness_seed_score >= 0 && j.public_usefulness_seed_score <= 100, "seed score range");
assert(j.latest && j.latest.raw_path && j.latest.viewer_path && j.latest.share_path, "latest paths");
assert(Array.isArray(j.recent), "recent array");
assert(j.recent.length >= 1, "recent records");
assert(j.public_private_boundary.owner_console_route === "/participant", "owner console route");
assert(j.public_private_boundary.owner_console_exposed === false, "owner console not exposed");
assert(j.public_private_boundary.forms_present === false, "forms not present");
assert(j.public_private_boundary.proof_generation_mutation_exposed === false, "proof mutation not exposed");
assert(j.public_private_boundary.private_participant_api_exposed === false, "participant api not exposed");
assert(j.public_private_boundary.buy_void_controls_exposed === false, "buy controls not exposed");
assert(j.public_private_boundary.stake_mutation_exposed === false, "stake not exposed");
assert(j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money movement");
assert(j.safety.wallet_send === false, "no wallet send");
assert(j.safety.wc_to_void_swap === false, "no wc swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");
assert(Array.isArray(j.next_metrics) && j.next_metrics.includes("node_effectiveness"), "node effectiveness next");
assert(j.next_metrics.includes("compression_candidate"), "compression next");

console.log("public_node_intelligence_proof_count=" + j.proof_count);
console.log("public_node_intelligence_latest_dataset=" + j.latest_dataset);
console.log("public_node_intelligence_latest_task=" + j.latest_task);
console.log("public_node_intelligence_latest_age_minutes=" + j.latest_age_minutes);
console.log("public_node_intelligence_raw_count=" + j.proofs_with_raw_json);
console.log("public_node_intelligence_seed_score=" + j.public_usefulness_seed_score);
NODE_VALIDATE
echo "[ok] intelligence JSON validates"

echo
echo "=== [5] public route safety still holds ==="
expect_grep "public node profile marker" "VOID_PUBLIC_NODE_PROFILE_V1" "$OUT/public-node.html"
expect_grep "public boundary marker" "VOID_PUBLIC_NODE_PRIVATE_BOUNDARY_V1" "$OUT/public-node.html"
expect_grep "public proof history reachable" "Recent verifiable Work Credit activity from this node" "$OUT/proofs.html"

reject_fixed "public node no form tags" "<form" "$OUT/public-node.html"
reject_fixed "public node no participant owner link" 'href="/participant' "$OUT/public-node.html"
reject_fixed "public node no private participant api" "/__void/participant" "$OUT/public-node.html"
reject_fixed "public node no buy void api" "/__void/buy-void" "$OUT/public-node.html"
reject_fixed "public node no proof mutation" "/wc-proof-demo/generate" "$OUT/public-node.html"
echo "[ok] public route safety still holds"

echo
echo "=== [6] latest proof source still parseable ==="
node "$OUT/latest-twelve.json" <<'NODE_LATEST'
const fs = require("fs");
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
let items = j.items || j.proofs || j.latest || [];
if (!Array.isArray(items)) items = items ? [items] : [];
if (!items.length) throw new Error("no latest public proof records");
const latest = items[0] || {};
const dataset = latest.dataset_id || latest.dataset || latest.id || "";
if (!dataset) throw new Error("latest proof missing dataset");
console.log("latest_feed_count=" + items.length);
console.log("latest_feed_dataset=" + dataset);
NODE_LATEST
echo "[ok] latest proof source still parseable"

echo
echo "=== close proof truth ==="
echo "route=/public-node/intelligence.json"
echo "marker=VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1"
echo "profile_route=/public-node"
echo "profile_marker=VOID_PUBLIC_NODE_PROFILE_V1"
echo "latest_endpoint=/wc-proofs/latest?limit=12"
echo "history_route=/proofs"
echo "data_backing=DataNet local-job JSON"
echo "metrics=proof_count,latest_dataset,latest_task,latest_age_ms,latest_age_minutes,proofs_with_raw_json,public_usefulness_seed_score"
echo "next_metrics=node_effectiveness,data_importance,data_staleness,compression_candidate,organization_score,retrieval_success"
echo "owner_console_route=/participant"
echo "owner_console_exposed=false"
echo "forms_present=false"
echo "proof_generation_mutation_exposed=false"
echo "private_participant_api_exposed=false"
echo "buy_void_controls_exposed=false"
echo "stake_mutation_exposed=false"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1_GREEN"
