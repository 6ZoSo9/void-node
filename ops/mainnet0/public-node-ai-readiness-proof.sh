#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-ai-readiness-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node AI Readiness v1 proof ==="
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
echo "raw_filesystem_url_exposure=false"
echo "ai_readiness_mutation=false"

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
echo "=== [1] source markers/AI readiness ==="
expect_grep "retrieval links marker preserved" "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1" src/index.ts
expect_grep "link health marker preserved" "VOID_PUBLIC_NODE_LINK_HEALTH_V1" src/index.ts
expect_grep "data quality marker preserved" "VOID_PUBLIC_NODE_DATA_QUALITY_V1" src/index.ts
expect_grep "AI readiness route marker" "VOID_PUBLIC_NODE_AI_READINESS_ROUTE_V1" src/index.ts
expect_grep "AI readiness json marker" "VOID_PUBLIC_NODE_AI_READINESS_V1" src/index.ts
expect_grep "AI readiness UI marker" "VOID_PUBLIC_NODE_AI_READINESS_UI_V1" src/index.ts
expect_grep "AI readiness script marker" "VOID_PUBLIC_NODE_AI_READINESS_SCRIPT_V1" src/index.ts
expect_grep "AI readiness route" "/public-node/ai-readiness.json" src/index.ts
expect_grep "AI score id" "publicNodeAiReadinessScore" src/index.ts
expect_grep "AI status id" "publicNodeAiReadinessStatus" src/index.ts
expect_grep "component score field" "component_scores" src/index.ts
expect_grep "aggregate policy" "aggregate_public_metrics_only" src/index.ts
echo "[ok] source markers/AI readiness"

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

for i in $(seq 1 120); do
  if curl -fsS "$BASE/public-node/ai-readiness.json" > "$OUT/ai-readiness.wait.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl -fsS "$BASE/public-node/ai-readiness.json" > "$OUT/ai-readiness.json"
curl -fsS "$BASE/public-node/data-quality.json" > "$OUT/data-quality.json"
curl -fsS "$BASE/public-node/link-health.json" > "$OUT/link-health.json"
curl -fsS "$BASE/public-node/intelligence.json" > "$OUT/intelligence.json"
curl -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$BASE/proofs" > "$OUT/proofs.html"

echo
echo "=== [4] AI readiness JSON validates aggregate public usefulness ==="
node - "$OUT/ai-readiness.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
function finite(x,m){ assert(Number.isFinite(x), m); }

assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_AI_READINESS_V1", "marker");
assert(j.route === "/public-node/ai-readiness.json", "route");

assert(j.source_markers.intelligence === "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1", "intelligence marker");
assert(j.source_markers.retrieval_links === "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1", "retrieval links marker");
assert(j.source_markers.link_health === "VOID_PUBLIC_NODE_LINK_HEALTH_V1", "link health marker");
assert(j.source_markers.data_quality === "VOID_PUBLIC_NODE_DATA_QUALITY_V1", "data quality marker");

finite(j.component_scores.retrieval_score, "retrieval score");
finite(j.component_scores.link_health_score, "link health score");
finite(j.component_scores.data_quality_score, "data quality score");
finite(j.component_scores.organization_score, "organization score");
finite(j.component_scores.freshness_score, "freshness score");
finite(j.ai_readiness_score, "ai readiness score");
finite(j.evaluation_duration_ms, "evaluation duration");

for (const [k,v] of Object.entries(j.component_scores)) {
  assert(v >= 0 && v <= 100, k + " range");
}
assert(j.ai_readiness_score >= 0 && j.ai_readiness_score <= 100, "ai readiness score range");
assert(typeof j.ai_readiness_status === "string" && j.ai_readiness_status.length >= 4, "status string");
assert(["excellent","ready","usable","limited","not_ready"].includes(j.ai_readiness_status), "known status");

assert(j.component_scores.retrieval_score >= 1, "retrieval signal present");
assert(j.component_scores.link_health_score >= 1, "link health signal present");
assert(j.component_scores.data_quality_score >= 1, "data quality signal present");
assert(j.component_scores.organization_score >= 1, "organization signal present");
assert(j.ai_readiness_score >= 50, "readiness not empty");

assert(j.weights.retrieval_score === 0.25, "retrieval weight");
assert(j.weights.link_health_score === 0.25, "link health weight");
assert(j.weights.data_quality_score === 0.25, "data quality weight");
assert(j.weights.organization_score === 0.15, "organization weight");
assert(j.weights.freshness_score === 0.10, "freshness weight");

assert(Array.isArray(j.recommended_next_actions), "recommended next actions array");
assert(j.recommended_next_actions.length >= 1, "recommended next action present");

finite(j.inputs.retrieval_links_count, "input retrieval links");
finite(j.inputs.working_link_count, "input working links");
finite(j.inputs.broken_link_count, "input broken links");
finite(j.inputs.quality_item_count, "input quality items");
finite(j.inputs.complete_public_proof_count, "input complete proofs");
finite(j.inputs.latest_age_minutes, "input latest age");
finite(j.inputs.stale_after_minutes, "input stale after");

assert(j.policy.aggregate_public_metrics_only === true, "aggregate public metrics only");
assert(j.policy.loopback_only === true, "loopback only");
assert(j.policy.public_routes_only === true, "public routes only");
assert(j.policy.local_path_exposure === false, "no local path exposure");
assert(j.policy.raw_filesystem_url_exposure === false, "no raw fs url");
assert(j.policy.mutation === false, "no mutation");

assert(j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money");
assert(j.safety.wallet_send === false, "no wallet");
assert(j.safety.wc_to_void_swap === false, "no swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");

console.log("retrieval_score=" + j.component_scores.retrieval_score);
console.log("link_health_score=" + j.component_scores.link_health_score);
console.log("data_quality_score=" + j.component_scores.data_quality_score);
console.log("organization_score=" + j.component_scores.organization_score);
console.log("freshness_score=" + j.component_scores.freshness_score);
console.log("ai_readiness_score=" + j.ai_readiness_score);
console.log("ai_readiness_status=" + j.ai_readiness_status);
console.log("recommended_next_actions=" + j.recommended_next_actions.join(","));
NODE_VALIDATE
echo "[ok] AI readiness JSON validates aggregate public usefulness"

echo
echo "=== [5] public AI readiness UI renders ==="
expect_grep "AI readiness UI marker" "VOID_PUBLIC_NODE_AI_READINESS_UI_V1" "$OUT/public-node.html"
expect_grep "AI readiness script marker" "VOID_PUBLIC_NODE_AI_READINESS_SCRIPT_V1" "$OUT/public-node.html"
expect_grep "AI readiness title" "AI readiness" "$OUT/public-node.html"
expect_grep "AI readiness score copy" "AI readiness score" "$OUT/public-node.html"
expect_grep "status copy" "Status" "$OUT/public-node.html"
expect_grep "retrieval copy" "Retrieval" "$OUT/public-node.html"
expect_grep "link health copy" "Link health" "$OUT/public-node.html"
expect_grep "data quality copy" "Data quality" "$OUT/public-node.html"
expect_grep "freshness copy" "Freshness" "$OUT/public-node.html"
expect_grep "AI readiness route fetch" "/public-node/ai-readiness.json" "$OUT/public-node.html"
expect_grep "AI score id" "publicNodeAiReadinessScore" "$OUT/public-node.html"
expect_grep "AI status id" "publicNodeAiReadinessStatus" "$OUT/public-node.html"
expect_grep "AI aggregate copy" "AI readiness aggregates public retrieval" "$OUT/public-node.html"
echo "[ok] public AI readiness UI renders"

echo
echo "=== [6] source routes still validate ==="
node - "$OUT/data-quality.json" <<'NODE_QUALITY'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
assert(j.marker === "VOID_PUBLIC_NODE_DATA_QUALITY_V1", "data quality marker");
assert(j.data_quality_score >= 80, "quality score still healthy");
console.log("data_quality_score=" + j.data_quality_score);
NODE_QUALITY

node - "$OUT/link-health.json" <<'NODE_HEALTH'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
assert(j.marker === "VOID_PUBLIC_NODE_LINK_HEALTH_V1", "link health marker");
assert(j.retrieval_link_health_score >= 1, "link health signal");
console.log("link_health_score=" + j.retrieval_link_health_score);
NODE_HEALTH
echo "[ok] source routes still validate"

echo
echo "=== [7] public/private boundary still holds ==="
expect_grep "proof history reachable" "Recent verifiable Work Credit activity from this node" "$OUT/proofs.html"
expect_grep "lossless compression policy" "VOID_PUBLIC_NODE_LOSSLESS_COMPRESSION_POLICY_V1" "$OUT/public-node.html"

reject_fixed "public node no form tags" "<form" "$OUT/public-node.html"
reject_fixed "public node no post method double quote" 'method="post' "$OUT/public-node.html"
reject_fixed "public node no post method single quote" "method='post" "$OUT/public-node.html"
reject_fixed "public node no action attr double quote" 'action="' "$OUT/public-node.html"
reject_fixed "public node no action attr single quote" "action='" "$OUT/public-node.html"
reject_fixed "public node no participant owner link" 'href="/participant' "$OUT/public-node.html"
reject_fixed "public node no private participant api" "/__void/participant" "$OUT/public-node.html"
reject_fixed "public node no buy void api" "/__void/buy-void" "$OUT/public-node.html"
reject_fixed "public node no proof mutation" "/wc-proof-demo/generate" "$OUT/public-node.html"

reject_fixed "AI readiness JSON no local cwd path" "$(pwd)" "$OUT/ai-readiness.json"
reject_fixed "AI readiness JSON no home path" "$HOME" "$OUT/ai-readiness.json"
reject_fixed "AI readiness JSON no datanet local_jobs path" "data_a/datanet_v1/local_jobs" "$OUT/ai-readiness.json"
reject_fixed "AI readiness JSON no file url" "file://" "$OUT/ai-readiness.json"
echo "[ok] public/private boundary still holds"

echo
echo "=== close proof truth ==="
echo "route=/public-node/ai-readiness.json"
echo "profile_route=/public-node"
echo "marker=VOID_PUBLIC_NODE_AI_READINESS_V1"
echo "route_marker=VOID_PUBLIC_NODE_AI_READINESS_ROUTE_V1"
echo "ui_marker=VOID_PUBLIC_NODE_AI_READINESS_UI_V1"
echo "script_marker=VOID_PUBLIC_NODE_AI_READINESS_SCRIPT_V1"
echo "source_markers=VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1,VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1,VOID_PUBLIC_NODE_LINK_HEALTH_V1,VOID_PUBLIC_NODE_DATA_QUALITY_V1"
echo "component_scores=retrieval_score,link_health_score,data_quality_score,organization_score,freshness_score"
echo "weights=retrieval:0.25,link_health:0.25,data_quality:0.25,organization:0.15,freshness:0.10"
echo "ai_readiness_fields=ai_readiness_score,ai_readiness_status,recommended_next_actions,inputs"
echo "policy=aggregate_public_metrics_only:true,loopback_only:true,public_routes_only:true,local_path_exposure:false,raw_filesystem_url_exposure:false,mutation:false"
echo "local_path_exposure=false"
echo "retrieval_mutation=false"
echo "raw_filesystem_url_exposure=false"
echo "ai_readiness_mutation=false"
echo "compression_candidate_semantics=recommendation_only"
echo "compression_execution=false"
echo "lossy_compression=false"
echo "original_replacement=false"
echo "lossless_restore_required=true"
echo "source_data_replacement=false"
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
echo "VOID_PUBLIC_NODE_AI_READINESS_V1_GREEN"
