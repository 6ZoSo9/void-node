#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-fresh-proof-seed-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Fresh Proof Seed v1 proof ==="
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
echo "fresh_proof_seed_mutation=false"
echo "wc_credit=false"
echo "chain_mutation=false"

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
echo "=== [1] source markers/fresh proof seed ==="
expect_grep "AI readiness marker preserved" "VOID_PUBLIC_NODE_AI_READINESS_V1" src/index.ts
expect_grep "fresh seed route marker" "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_ROUTE_V1" src/index.ts
expect_grep "fresh seed json marker" "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_V1" src/index.ts
expect_grep "fresh seed UI marker" "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_UI_V1" src/index.ts
expect_grep "fresh seed script marker" "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_SCRIPT_V1" src/index.ts
expect_grep "fresh seed route" "/public-node/fresh-proof-seed.json" src/index.ts
expect_grep "fresh seed score id" "publicNodeFreshSeedScore" src/index.ts
expect_grep "fresh seed AI wiring" "public_seed_freshness_score" src/index.ts
expect_grep "fresh seed policy" "generated_from_public_metrics_only" src/index.ts
echo "[ok] source markers/fresh proof seed"

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
  if curl --max-time 15 -fsS "$BASE/public-node/fresh-proof-seed.json" > "$OUT/fresh-proof-seed.wait.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl --max-time 15 -fsS "$BASE/public-node/fresh-proof-seed.json" > "$OUT/fresh-proof-seed.json"
curl --max-time 15 -fsS "$BASE/public-node/ai-readiness.json" > "$OUT/ai-readiness.json"
curl --max-time 15 -fsS "$BASE/public-node/data-quality.json" > "$OUT/data-quality.json"
curl --max-time 15 -fsS "$BASE/public-node/link-health.json" > "$OUT/link-health.json"
curl --max-time 15 -fsS "$BASE/public-node/intelligence.json" > "$OUT/intelligence.json"
curl --max-time 15 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 15 -fsS "$BASE/proofs" > "$OUT/proofs.html"

echo
echo "=== [4] fresh proof seed JSON validates public fresh signal ==="
node - "$OUT/fresh-proof-seed.json" <<'NODE_SEED'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
function finite(x,m){ assert(Number.isFinite(x), m); }

assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_V1", "marker");
assert(j.route === "/public-node/fresh-proof-seed.json", "route");
assert(j.seed_kind === "public_node_readiness_refresh_seed", "seed kind");
assert(j.seed_task === "publish_fresher_public_work_proof_signal", "seed task");
finite(j.seed_age_minutes, "seed age");
finite(j.public_seed_freshness_score, "seed freshness");
assert(j.seed_age_minutes >= 0 && j.seed_age_minutes <= 1, "seed age fresh");
assert(j.public_seed_freshness_score === 100, "freshness score");
assert(j.evidence_ready === true, "evidence ready");

assert(j.source_markers.intelligence === "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1", "intelligence marker");
assert(j.source_markers.retrieval_links === "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1", "retrieval links marker");
assert(j.source_markers.link_health === "VOID_PUBLIC_NODE_LINK_HEALTH_V1", "link health marker");
assert(j.source_markers.data_quality === "VOID_PUBLIC_NODE_DATA_QUALITY_V1", "data quality marker");

finite(j.evidence.retrieval_links_count, "retrieval links");
finite(j.evidence.working_link_count, "working links");
finite(j.evidence.quality_item_count, "quality items");
finite(j.evidence.data_quality_score, "data quality score");
finite(j.evidence.link_health_score, "link health score");
assert(j.evidence.retrieval_links_count >= 1, "retrieval evidence");
assert(j.evidence.working_link_count >= 1, "working evidence");
assert(j.evidence.quality_item_count >= 1, "quality evidence");
assert(j.evidence.data_quality_score >= 80, "quality healthy");
assert(j.evidence.link_health_score >= 80, "link health healthy");

assert(j.policy.generated_from_public_metrics_only === true, "public metrics only");
assert(j.policy.loopback_only === true, "loopback only");
assert(j.policy.public_routes_only === true, "public routes only");
assert(j.policy.persisted_to_disk === false, "not persisted");
assert(j.policy.chain_mutation === false, "no chain mutation");
assert(j.policy.wc_credit === false, "no wc credit");
assert(j.policy.local_path_exposure === false, "no local path");
assert(j.policy.raw_filesystem_url_exposure === false, "no raw fs");
assert(j.policy.mutation === false, "no mutation");

assert(j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money");
assert(j.safety.wallet_send === false, "no wallet");
assert(j.safety.wc_to_void_swap === false, "no swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");

console.log("seed_kind=" + j.seed_kind);
console.log("seed_task=" + j.seed_task);
console.log("seed_age_minutes=" + j.seed_age_minutes);
console.log("public_seed_freshness_score=" + j.public_seed_freshness_score);
console.log("evidence_ready=" + j.evidence_ready);
console.log("evidence_retrieval_links_count=" + j.evidence.retrieval_links_count);
console.log("evidence_working_link_count=" + j.evidence.working_link_count);
NODE_SEED
echo "[ok] fresh proof seed JSON validates public fresh signal"

echo
echo "=== [5] AI readiness consumes fresh proof seed ==="
node - "$OUT/ai-readiness.json" <<'NODE_AI'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
function finite(x,m){ assert(Number.isFinite(x), m); }

assert(j.marker === "VOID_PUBLIC_NODE_AI_READINESS_V1", "ai marker");
assert(j.source_markers.fresh_proof_seed === "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_V1", "fresh seed marker");
finite(j.component_scores.freshness_score, "freshness score");
finite(j.ai_readiness_score, "ai readiness score");
finite(j.inputs.public_seed_freshness_score, "seed input score");
finite(j.inputs.fresh_proof_seed_age_minutes, "seed input age");
assert(j.inputs.public_seed_freshness_score === 100, "seed freshness input");
assert(j.component_scores.freshness_score >= 90, "freshness score lifted");
assert(j.ai_readiness_score >= 80, "readiness lifted to ready band");
assert(["ready","excellent"].includes(j.ai_readiness_status), "ready or excellent");
assert(!j.recommended_next_actions.includes("publish_fresher_public_work_proofs"), "freshness action cleared");

console.log("freshness_score=" + j.component_scores.freshness_score);
console.log("ai_readiness_score=" + j.ai_readiness_score);
console.log("ai_readiness_status=" + j.ai_readiness_status);
console.log("recommended_next_actions=" + j.recommended_next_actions.join(","));
NODE_AI
echo "[ok] AI readiness consumes fresh proof seed"

echo
echo "=== [6] public fresh proof seed UI renders ==="
expect_grep "fresh seed UI marker" "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_UI_V1" "$OUT/public-node.html"
expect_grep "fresh seed script marker" "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_SCRIPT_V1" "$OUT/public-node.html"
expect_grep "fresh seed title" "Fresh public proof seed" "$OUT/public-node.html"
expect_grep "seed freshness copy" "Seed freshness" "$OUT/public-node.html"
expect_grep "seed age copy" "Seed age" "$OUT/public-node.html"
expect_grep "evidence ready copy" "Evidence ready" "$OUT/public-node.html"
expect_grep "seed task copy" "Seed task" "$OUT/public-node.html"
expect_grep "fresh seed route fetch" "/public-node/fresh-proof-seed.json" "$OUT/public-node.html"
expect_grep "fresh seed score id" "publicNodeFreshSeedScore" "$OUT/public-node.html"
expect_grep "fresh seed safety copy" "does not credit WC" "$OUT/public-node.html"
echo "[ok] public fresh proof seed UI renders"

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

reject_fixed "fresh seed JSON no local cwd path" "$(pwd)" "$OUT/fresh-proof-seed.json"
reject_fixed "fresh seed JSON no home path" "$HOME" "$OUT/fresh-proof-seed.json"
reject_fixed "fresh seed JSON no datanet local_jobs path" "data_a/datanet_v1/local_jobs" "$OUT/fresh-proof-seed.json"
reject_fixed "fresh seed JSON no file url" "file://" "$OUT/fresh-proof-seed.json"
reject_fixed "AI readiness JSON no local cwd path" "$(pwd)" "$OUT/ai-readiness.json"
reject_fixed "AI readiness JSON no home path" "$HOME" "$OUT/ai-readiness.json"
reject_fixed "AI readiness JSON no datanet local_jobs path" "data_a/datanet_v1/local_jobs" "$OUT/ai-readiness.json"
reject_fixed "AI readiness JSON no file url" "file://" "$OUT/ai-readiness.json"
echo "[ok] public/private boundary still holds"

echo
echo "=== close proof truth ==="
echo "route=/public-node/fresh-proof-seed.json"
echo "ai_readiness_route=/public-node/ai-readiness.json"
echo "profile_route=/public-node"
echo "marker=VOID_PUBLIC_NODE_FRESH_PROOF_SEED_V1"
echo "route_marker=VOID_PUBLIC_NODE_FRESH_PROOF_SEED_ROUTE_V1"
echo "ui_marker=VOID_PUBLIC_NODE_FRESH_PROOF_SEED_UI_V1"
echo "script_marker=VOID_PUBLIC_NODE_FRESH_PROOF_SEED_SCRIPT_V1"
echo "ai_marker=VOID_PUBLIC_NODE_AI_READINESS_V1"
echo "freshness_lift=true"
echo "seed_fields=seed_kind,seed_task,seed_age_minutes,public_seed_freshness_score,evidence_ready,evidence"
echo "policy=generated_from_public_metrics_only:true,loopback_only:true,public_routes_only:true,persisted_to_disk:false,chain_mutation:false,wc_credit:false,local_path_exposure:false,raw_filesystem_url_exposure:false,mutation:false"
echo "local_path_exposure=false"
echo "retrieval_mutation=false"
echo "raw_filesystem_url_exposure=false"
echo "fresh_proof_seed_mutation=false"
echo "chain_mutation=false"
echo "wc_credit=false"
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
echo "VOID_PUBLIC_NODE_FRESH_PROOF_SEED_V1_GREEN"
