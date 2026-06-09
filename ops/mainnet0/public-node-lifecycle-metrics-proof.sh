#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-lifecycle-metrics-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Lifecycle Metrics v1 proof ==="
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
echo "=== [1] source markers/lifecycle metrics ==="
expect_grep "intelligence json marker preserved" "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1" src/index.ts
expect_grep "intelligence UI marker preserved" "VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1" src/index.ts
expect_grep "lifecycle marker" "VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1" src/index.ts
expect_grep "oldest age field" "oldest_proof_age_minutes" src/index.ts
expect_grep "newest age field" "newest_proof_age_minutes" src/index.ts
expect_grep "total bytes field" "total_public_proof_bytes" src/index.ts
expect_grep "average size field" "average_public_proof_size_bytes" src/index.ts
expect_grep "stale proof count field" "stale_proof_count" src/index.ts
expect_grep "large record count field" "large_record_count" src/index.ts
expect_grep "compression candidate count field" "compression_candidate_count" src/index.ts
expect_grep "organization score field" "organization_seed_score" src/index.ts
expect_grep "lifecycle policy field" "lifecycle_policy" src/index.ts
echo "[ok] source markers/lifecycle metrics"

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

echo
echo "=== [4] lifecycle JSON validates ==="
node "$OUT/intelligence.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
function finiteOrNull(x,m){ if(x !== null && !Number.isFinite(x)) throw new Error(m); }

assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1", "intelligence marker");
assert(j.lifecycle_marker === "VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1", "lifecycle marker");
assert(Number.isFinite(j.proof_count), "proof_count finite");
assert(j.proof_count >= 1, "proof_count >= 1");
finiteOrNull(j.oldest_proof_age_ms, "oldest age ms");
finiteOrNull(j.oldest_proof_age_minutes, "oldest age minutes");
finiteOrNull(j.newest_proof_age_ms, "newest age ms");
finiteOrNull(j.newest_proof_age_minutes, "newest age minutes");
assert(Number.isFinite(j.total_public_proof_bytes), "total bytes finite");
assert(Number.isFinite(j.average_public_proof_size_bytes), "average size finite");
assert(Number.isFinite(j.stale_proof_count), "stale count finite");
assert(Number.isFinite(j.large_record_count), "large count finite");
assert(Number.isFinite(j.compression_candidate_count), "compression count finite");
assert(Number.isFinite(j.organization_seed_score), "organization score finite");
assert(j.organization_seed_score >= 0 && j.organization_seed_score <= 100, "organization score range");
assert(j.lifecycle_policy && j.lifecycle_policy.stale_after_minutes === 1440, "stale policy");
assert(j.lifecycle_policy.large_record_threshold_bytes === 4096, "large policy");
assert(j.lifecycle_policy.compression_candidate_rule === "stale_or_large_public_record", "candidate rule");
assert(Array.isArray(j.recent), "recent array");
assert(j.recent.length >= 1, "recent present");
assert(j.recent[0].hasOwnProperty("age_minutes"), "recent age_minutes");
assert(j.recent[0].hasOwnProperty("compression_candidate"), "recent compression_candidate");
assert(j.safety && j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money");
assert(j.safety.wallet_send === false, "no wallet send");
assert(j.safety.wc_to_void_swap === false, "no wc swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");
assert(j.public_private_boundary.owner_console_exposed === false, "owner console not exposed");
assert(j.public_private_boundary.forms_present === false, "forms not present");
assert(j.public_private_boundary.private_participant_api_exposed === false, "private participant api not exposed");
assert(j.public_private_boundary.buy_void_controls_exposed === false, "buy controls not exposed");
assert(j.public_private_boundary.stake_mutation_exposed === false, "stake mutation not exposed");

console.log("proof_count=" + j.proof_count);
console.log("oldest_proof_age_minutes=" + j.oldest_proof_age_minutes);
console.log("newest_proof_age_minutes=" + j.newest_proof_age_minutes);
console.log("total_public_proof_bytes=" + j.total_public_proof_bytes);
console.log("average_public_proof_size_bytes=" + j.average_public_proof_size_bytes);
console.log("stale_proof_count=" + j.stale_proof_count);
console.log("large_record_count=" + j.large_record_count);
console.log("compression_candidate_count=" + j.compression_candidate_count);
console.log("organization_seed_score=" + j.organization_seed_score);
NODE_VALIDATE
echo "[ok] lifecycle JSON validates"

echo
echo "=== [5] public node UI and boundary still hold ==="
expect_grep "public profile marker" "VOID_PUBLIC_NODE_PROFILE_V1" "$OUT/public-node.html"
expect_grep "public intelligence UI marker" "VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1" "$OUT/public-node.html"
expect_grep "public dashboard title" "Node intelligence" "$OUT/public-node.html"
expect_grep "public proof history reachable" "Recent verifiable Work Credit activity from this node" "$OUT/proofs.html"

reject_fixed "public node no form tags" "<form" "$OUT/public-node.html"
reject_fixed "public node no post method double quote" 'method="post' "$OUT/public-node.html"
reject_fixed "public node no post method single quote" "method='post" "$OUT/public-node.html"
reject_fixed "public node no action attr double quote" 'action="' "$OUT/public-node.html"
reject_fixed "public node no action attr single quote" "action='" "$OUT/public-node.html"
reject_fixed "public node no participant owner link" 'href="/participant' "$OUT/public-node.html"
reject_fixed "public node no private participant api" "/__void/participant" "$OUT/public-node.html"
reject_fixed "public node no buy void api" "/__void/buy-void" "$OUT/public-node.html"
reject_fixed "public node no proof mutation" "/wc-proof-demo/generate" "$OUT/public-node.html"
echo "[ok] public node UI and boundary still hold"

echo
echo "=== close proof truth ==="
echo "route=/public-node/intelligence.json"
echo "profile_route=/public-node"
echo "marker=VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1"
echo "json_marker=VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1"
echo "ui_marker=VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1"
echo "lifecycle_metrics=oldest_proof_age_minutes,newest_proof_age_minutes,total_public_proof_bytes,average_public_proof_size_bytes,stale_proof_count,large_record_count,compression_candidate_count,organization_seed_score"
echo "lifecycle_policy=stale_after_minutes:1440,large_record_threshold_bytes:4096,compression_candidate_rule:stale_or_large_public_record"
echo "data_backing=DataNet local-job JSON"
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
echo "VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1_GREEN"
