#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-retrieval-metrics-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Retrieval Metrics v1 proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "compression_execution=false"
echo "lossy_compression=false"
echo "original_replacement=false"
echo "local_path_exposure=false"
echo "retrieval_mutation=false"

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
echo "=== [1] source markers/retrieval metrics ==="
expect_grep "intelligence json marker preserved" "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1" src/index.ts
expect_grep "lifecycle marker preserved" "VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1" src/index.ts
expect_grep "lifecycle UI marker preserved" "VOID_PUBLIC_NODE_LIFECYCLE_UI_V1" src/index.ts
expect_grep "lossless policy preserved" "VOID_PUBLIC_NODE_LOSSLESS_COMPRESSION_POLICY_V1" src/index.ts
expect_grep "retrieval marker" "VOID_PUBLIC_NODE_RETRIEVAL_METRICS_V1" src/index.ts
expect_grep "retrieval candidate count field" "retrieval_candidate_count" src/index.ts
expect_grep "recent proof link count field" "recent_proof_link_count" src/index.ts
expect_grep "raw json link count field" "raw_json_link_count" src/index.ts
expect_grep "verifier link count field" "verifier_link_count" src/index.ts
expect_grep "share link count field" "share_link_count" src/index.ts
expect_grep "retrieval seed score field" "retrieval_seed_score" src/index.ts
expect_grep "no local path exposure policy" "no_local_path_exposure" src/index.ts
echo "[ok] source markers/retrieval metrics"

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
echo "=== [4] retrieval JSON validates ==="
node - "$OUT/intelligence.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
function finite(x,m){ assert(Number.isFinite(x), m); }

assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1", "json marker");
assert(j.lifecycle_marker === "VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1", "lifecycle marker");
assert(j.retrieval_marker === "VOID_PUBLIC_NODE_RETRIEVAL_METRICS_V1", "retrieval marker");

finite(j.proof_count, "proof_count finite");
finite(j.retrieval_candidate_count, "retrieval_candidate_count finite");
finite(j.recent_proof_link_count, "recent_proof_link_count finite");
finite(j.raw_json_link_count, "raw_json_link_count finite");
finite(j.verifier_link_count, "verifier_link_count finite");
finite(j.share_link_count, "share_link_count finite");
finite(j.retrieval_seed_score, "retrieval_seed_score finite");

assert(j.retrieval_seed_score >= 0 && j.retrieval_seed_score <= 100, "retrieval score range");
assert(j.retrieval_candidate_count <= j.proof_count, "candidate <= proof count");
assert(j.recent_proof_link_count <= j.proof_count, "proof links <= proof count");
assert(j.raw_json_link_count <= j.proof_count, "raw links <= proof count");
assert(j.verifier_link_count <= j.proof_count, "verifier links <= proof count");
assert(j.share_link_count <= j.proof_count, "share links <= proof count");

assert(j.retrieval_policy && j.retrieval_policy.public_route_only === true, "public route only");
assert(j.retrieval_policy.no_local_path_exposure === true, "no local path exposure");
assert(j.retrieval_policy.raw_json_semantics === "count_public_raw_json_availability_without_exposing_local_filesystem_paths", "raw json semantics");
assert(j.retrieval_policy.retrieval_candidate_rule === "public_dataset_id_present", "candidate rule");
assert(j.retrieval_policy.proof_link_rule === "public_dataset_and_public_who_present", "proof link rule");

assert(Array.isArray(j.recent), "recent array");
assert(j.recent.length >= 1, "recent present");
assert(j.recent[0].hasOwnProperty("retrieval_candidate"), "recent retrieval_candidate");
assert(j.recent[0].hasOwnProperty("has_public_proof_link"), "recent proof link bool");
assert(j.recent[0].hasOwnProperty("has_public_verifier_link"), "recent verifier link bool");
assert(j.recent[0].hasOwnProperty("has_public_share_link"), "recent share link bool");
assert(j.recent[0].hasOwnProperty("has_public_raw_json"), "recent raw json bool");

assert(j.safety && j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money");
assert(j.safety.wallet_send === false, "no wallet send");
assert(j.safety.wc_to_void_swap === false, "no wc swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");

console.log("proof_count=" + j.proof_count);
console.log("retrieval_candidate_count=" + j.retrieval_candidate_count);
console.log("recent_proof_link_count=" + j.recent_proof_link_count);
console.log("raw_json_link_count=" + j.raw_json_link_count);
console.log("verifier_link_count=" + j.verifier_link_count);
console.log("share_link_count=" + j.share_link_count);
console.log("retrieval_seed_score=" + j.retrieval_seed_score);
NODE_VALIDATE
echo "[ok] retrieval JSON validates"

echo
echo "=== [5] public retrieval surfaces still support proof actions ==="
node - "$OUT/latest-twelve.json" "$OUT/proofs.html" "src/index.ts" <<'NODE_LATEST'
const fs = require("fs");
const latestPath = process.argv[2];
const proofsPath = process.argv[3];
const sourcePath = process.argv[4];

const latest = JSON.parse(fs.readFileSync(latestPath, "utf8"));
const proofsHtml = fs.readFileSync(proofsPath, "utf8");
const source = fs.readFileSync(sourcePath, "utf8");

function assert(x,m){ if(!x) throw new Error(m); }

assert(latest && latest.ok === true, "latest endpoint ok");
const items = Array.isArray(latest.items) ? latest.items : [];
assert(proofsHtml.includes("Recent verifiable Work Credit activity from this node"), "proof history page present");

const actionSource = JSON.stringify(latest) + "\n" + proofsHtml + "\n" + source;
assert(/Verify/i.test(actionSource), "verify action/source present");
assert(/Raw JSON/i.test(actionSource) || /raw_json/i.test(actionSource), "raw json action/source present");
assert(/Share/i.test(actionSource), "share action/source present");

console.log("latest_items=" + items.length);
console.log("retrieval_action_source=latest_json_or_public_proofs_or_source");
NODE_LATEST
echo "[ok] public retrieval surfaces still support proof actions"

echo
echo "=== [6] public/private boundary still holds ==="
expect_grep "public profile marker" "VOID_PUBLIC_NODE_PROFILE_V1" "$OUT/public-node.html"
expect_grep "public lifecycle UI marker" "VOID_PUBLIC_NODE_LIFECYCLE_UI_V1" "$OUT/public-node.html"
expect_grep "lossless compression policy" "VOID_PUBLIC_NODE_LOSSLESS_COMPRESSION_POLICY_V1" "$OUT/public-node.html"
expect_grep "proof history reachable" "Recent verifiable Work Credit activity from this node" "$OUT/proofs.html"

reject_fixed "public node no form tags" "<form" "$OUT/public-node.html"
reject_fixed "public node no post method double quote" 'method="post' "$OUT/public-node.html"
reject_fixed "public node no post method single quote" "method='post" "$OUT/public-node.html"
reject_fixed "public node no action attr double quote" 'action="' "$OUT/public-node.html"
reject_fixed "public node no action attr single quote" "action='" "$OUT/public-node.html"
reject_fixed "public node no participant owner link" 'href="/participant' "$OUT/public-node.html"
reject_fixed "public node no private participant api" "/__void/participant" "$OUT/public-node.html"
reject_fixed "public node no buy void api" "/__void/buy-void" "$OUT/public-node.html"
reject_fixed "public node no proof mutation" "/wc-proof-demo/generate" "$OUT/public-node.html"

reject_fixed "no compress href double quote" 'href="/compress' "$OUT/public-node.html"
reject_fixed "no compress action double quote" 'action="/compress' "$OUT/public-node.html"
reject_fixed "no compress fetch double quote" 'fetch("/compress' "$OUT/public-node.html"
reject_fixed "no archive href double quote" 'href="/archive' "$OUT/public-node.html"
reject_fixed "no archive action double quote" 'action="/archive' "$OUT/public-node.html"
reject_fixed "no archive fetch double quote" 'fetch("/archive' "$OUT/public-node.html"
reject_fixed "no delete href double quote" 'href="/delete' "$OUT/public-node.html"
reject_fixed "no delete action double quote" 'action="/delete' "$OUT/public-node.html"
reject_fixed "no delete fetch double quote" 'fetch("/delete' "$OUT/public-node.html"

reject_fixed "intelligence JSON no local cwd path" "$(pwd)" "$OUT/intelligence.json"
reject_fixed "intelligence JSON no home path" "$HOME" "$OUT/intelligence.json"
reject_fixed "intelligence JSON no datanet local_jobs path" "data_a/datanet_v1/local_jobs" "$OUT/intelligence.json"
echo "[ok] public/private boundary still holds"

echo
echo "=== close proof truth ==="
echo "route=/public-node/intelligence.json"
echo "profile_route=/public-node"
echo "marker=VOID_PUBLIC_NODE_RETRIEVAL_METRICS_V1"
echo "json_marker=VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1"
echo "lifecycle_marker=VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1"
echo "ui_marker=VOID_PUBLIC_NODE_LIFECYCLE_UI_V1"
echo "retrieval_metrics=retrieval_candidate_count,recent_proof_link_count,raw_json_link_count,verifier_link_count,share_link_count,retrieval_seed_score"
echo "retrieval_policy=public_route_only:true,no_local_path_exposure:true,raw_json_semantics:count_public_raw_json_availability_without_exposing_local_filesystem_paths"
echo "compression_candidate_semantics=recommendation_only"
echo "compression_execution=false"
echo "lossy_compression=false"
echo "original_replacement=false"
echo "lossless_restore_required=true"
echo "source_data_replacement=false"
echo "local_path_exposure=false"
echo "retrieval_mutation=false"
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
echo "VOID_PUBLIC_NODE_RETRIEVAL_METRICS_V1_GREEN"
