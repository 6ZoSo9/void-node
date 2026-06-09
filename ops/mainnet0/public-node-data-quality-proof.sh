#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-data-quality-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Data Quality v1 proof ==="
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
echo "data_quality_mutation=false"

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
echo "=== [1] source markers/data quality ==="
expect_grep "retrieval links marker preserved" "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1" src/index.ts
expect_grep "link health marker preserved" "VOID_PUBLIC_NODE_LINK_HEALTH_V1" src/index.ts
expect_grep "data quality route marker" "VOID_PUBLIC_NODE_DATA_QUALITY_ROUTE_V1" src/index.ts
expect_grep "data quality json marker" "VOID_PUBLIC_NODE_DATA_QUALITY_V1" src/index.ts
expect_grep "data quality UI marker" "VOID_PUBLIC_NODE_DATA_QUALITY_UI_V1" src/index.ts
expect_grep "data quality script marker" "VOID_PUBLIC_NODE_DATA_QUALITY_SCRIPT_V1" src/index.ts
expect_grep "data quality route" "/public-node/data-quality.json" src/index.ts
expect_grep "quality score id" "publicNodeDataQualityScore" src/index.ts
expect_grep "complete proof id" "publicNodeCompleteProofCount" src/index.ts
expect_grep "quality pass id" "publicNodeQualityPassCount" src/index.ts
expect_grep "quality warn id" "publicNodeQualityWarnCount" src/index.ts
expect_grep "scoring fields" "has_working_public_link" src/index.ts
echo "[ok] source markers/data quality"

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
  if curl -fsS "$BASE/public-node/data-quality.json" > "$OUT/data-quality.wait.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl -fsS "$BASE/public-node/data-quality.json" > "$OUT/data-quality.json"
curl -fsS "$BASE/public-node/link-health.json" > "$OUT/link-health.json"
curl -fsS "$BASE/public-node/intelligence.json" > "$OUT/intelligence.json"
curl -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$BASE/proofs" > "$OUT/proofs.html"

echo
echo "=== [4] data quality JSON validates public usefulness scoring ==="
node - "$OUT/data-quality.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
function finite(x,m){ assert(Number.isFinite(x), m); }

assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_DATA_QUALITY_V1", "marker");
assert(j.route === "/public-node/data-quality.json", "route");
assert(j.source_marker === "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1", "source marker");
assert(j.health_marker === "VOID_PUBLIC_NODE_LINK_HEALTH_V1", "health marker");

finite(j.retrieval_links_count, "retrieval_links_count");
finite(j.quality_item_count, "quality_item_count");
finite(j.complete_public_proof_count, "complete_public_proof_count");
finite(j.quality_pass_count, "quality_pass_count");
finite(j.quality_warn_count, "quality_warn_count");
finite(j.average_public_proof_quality_score, "average_public_proof_quality_score");
finite(j.data_quality_score, "data_quality_score");
finite(j.evaluation_duration_ms, "evaluation_duration_ms");

assert(j.retrieval_links_count >= 1, "retrieval links present");
assert(j.retrieval_links_count <= 12, "retrieval links capped");
assert(j.quality_item_count === j.retrieval_links_count, "quality item count matches links");
assert(j.quality_pass_count + j.quality_warn_count === j.quality_item_count, "pass+warn=item");
assert(j.data_quality_score >= 0 && j.data_quality_score <= 100, "score range");
assert(j.average_public_proof_quality_score === j.data_quality_score, "average score alias");

assert(Array.isArray(j.items), "items array");
assert(j.items.length === j.quality_item_count, "items length");
for (const item of j.items) {
  assert(Number.isFinite(item.index), "item index");
  assert(typeof item.dataset === "string" && item.dataset.startsWith("ds_"), "dataset safe");
  assert(typeof item.who === "string" && item.who.length >= 4, "who safe");
  assert(typeof item.task === "string" && item.task.length >= 1, "task safe");
  assert(typeof item.has_dataset === "boolean", "has_dataset bool");
  assert(typeof item.has_who === "boolean", "has_who bool");
  assert(typeof item.has_task === "boolean", "has_task bool");
  assert(typeof item.has_delta === "boolean", "has_delta bool");
  assert(typeof item.has_proof_link === "boolean", "has_proof_link bool");
  assert(typeof item.has_verifier === "boolean", "has_verifier bool");
  assert(typeof item.has_share_link === "boolean", "has_share_link bool");
  assert(typeof item.has_raw_availability === "boolean", "has_raw_availability bool");
  assert(typeof item.has_working_public_link === "boolean", "has_working_public_link bool");
  assert(Number.isFinite(item.quality_score), "item quality score");
  assert(item.quality_score >= 0 && item.quality_score <= 100, "item score range");
  assert(!Object.prototype.hasOwnProperty.call(item, "raw_path"), "no raw_path item");
  assert(!Object.prototype.hasOwnProperty.call(item, "path"), "no path item");
  const blob = JSON.stringify(item);
  assert(!blob.includes("/home/"), "no home path item");
  assert(!blob.includes("data_a/datanet_v1/local_jobs"), "no local_jobs item");
  assert(!blob.includes("file://"), "no file URL item");
}

assert(j.items.some((x) => x.has_dataset && x.has_who && x.has_task), "some useful item");
assert(j.items.some((x) => x.has_working_public_link), "some working public link");
assert(j.data_quality_score >= 80, "quality score high enough for healthy public retrieval links");

assert(j.policy.max_items === 12, "max items");
assert(j.policy.public_identifiers_only === true, "public identifiers only");
assert(j.policy.public_paths_only === true, "public paths only");
assert(j.policy.local_path_exposure === false, "no local path exposure");
assert(j.policy.raw_filesystem_url_exposure === false, "no raw fs exposure");
assert(j.policy.mutation === false, "no mutation");
assert(Array.isArray(j.policy.scoring_fields), "scoring fields array");
assert(j.policy.scoring_fields.includes("has_dataset"), "has_dataset scoring");
assert(j.policy.scoring_fields.includes("has_who"), "has_who scoring");
assert(j.policy.scoring_fields.includes("has_task"), "has_task scoring");
assert(j.policy.scoring_fields.includes("has_delta"), "has_delta scoring");
assert(j.policy.scoring_fields.includes("has_verifier"), "has_verifier scoring");
assert(j.policy.scoring_fields.includes("has_share_link"), "has_share scoring");
assert(j.policy.scoring_fields.includes("has_raw_availability"), "has_raw scoring");
assert(j.policy.scoring_fields.includes("has_working_public_link"), "working link scoring");

assert(j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money");
assert(j.safety.wallet_send === false, "no wallet");
assert(j.safety.wc_to_void_swap === false, "no swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");

console.log("retrieval_links_count=" + j.retrieval_links_count);
console.log("quality_item_count=" + j.quality_item_count);
console.log("complete_public_proof_count=" + j.complete_public_proof_count);
console.log("quality_pass_count=" + j.quality_pass_count);
console.log("quality_warn_count=" + j.quality_warn_count);
console.log("data_quality_score=" + j.data_quality_score);
console.log("first_quality_score=" + j.items[0].quality_score);
console.log("first_dataset=" + j.items[0].dataset);
NODE_VALIDATE
echo "[ok] data quality JSON validates public usefulness scoring"

echo
echo "=== [5] public data quality UI renders ==="
expect_grep "data quality UI marker" "VOID_PUBLIC_NODE_DATA_QUALITY_UI_V1" "$OUT/public-node.html"
expect_grep "data quality script marker" "VOID_PUBLIC_NODE_DATA_QUALITY_SCRIPT_V1" "$OUT/public-node.html"
expect_grep "data quality title" "Public data quality" "$OUT/public-node.html"
expect_grep "quality score copy" "Quality score" "$OUT/public-node.html"
expect_grep "complete proofs copy" "Complete proofs" "$OUT/public-node.html"
expect_grep "quality pass copy" "Quality pass" "$OUT/public-node.html"
expect_grep "quality warnings copy" "Quality warnings" "$OUT/public-node.html"
expect_grep "data quality route fetch" "/public-node/data-quality.json" "$OUT/public-node.html"
expect_grep "quality score id" "publicNodeDataQualityScore" "$OUT/public-node.html"
expect_grep "complete proof id" "publicNodeCompleteProofCount" "$OUT/public-node.html"
expect_grep "quality pass id" "publicNodeQualityPassCount" "$OUT/public-node.html"
expect_grep "quality warn id" "publicNodeQualityWarnCount" "$OUT/public-node.html"
expect_grep "quality checks copy" "Quality checks public dataset" "$OUT/public-node.html"
echo "[ok] public data quality UI renders"

echo
echo "=== [6] link health source still validates ==="
node - "$OUT/link-health.json" <<'NODE_HEALTH'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
assert(j.marker === "VOID_PUBLIC_NODE_LINK_HEALTH_V1", "health marker");
assert(j.source_marker === "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1", "source marker");
assert(j.retrieval_links_count >= 1, "links present");
assert(j.probed_link_count >= 1, "probes present");
assert(j.working_link_count + j.broken_link_count === j.probed_link_count, "working+broken=probed");
console.log("link_health_score=" + j.retrieval_link_health_score);
NODE_HEALTH
echo "[ok] link health source still validates"

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

reject_fixed "data quality JSON no local cwd path" "$(pwd)" "$OUT/data-quality.json"
reject_fixed "data quality JSON no home path" "$HOME" "$OUT/data-quality.json"
reject_fixed "data quality JSON no datanet local_jobs path" "data_a/datanet_v1/local_jobs" "$OUT/data-quality.json"
reject_fixed "data quality JSON no file url" "file://" "$OUT/data-quality.json"
echo "[ok] public/private boundary still holds"

echo
echo "=== close proof truth ==="
echo "route=/public-node/data-quality.json"
echo "profile_route=/public-node"
echo "marker=VOID_PUBLIC_NODE_DATA_QUALITY_V1"
echo "route_marker=VOID_PUBLIC_NODE_DATA_QUALITY_ROUTE_V1"
echo "ui_marker=VOID_PUBLIC_NODE_DATA_QUALITY_UI_V1"
echo "script_marker=VOID_PUBLIC_NODE_DATA_QUALITY_SCRIPT_V1"
echo "source_marker=VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1"
echo "health_marker=VOID_PUBLIC_NODE_LINK_HEALTH_V1"
echo "data_quality_fields=retrieval_links_count,quality_item_count,complete_public_proof_count,quality_pass_count,quality_warn_count,average_public_proof_quality_score,data_quality_score,items"
echo "scoring_fields=has_dataset,has_who,has_task,has_delta,has_proof_link,has_verifier,has_share_link,has_raw_availability,has_working_public_link"
echo "policy=max_items:12,public_identifiers_only:true,public_paths_only:true,local_path_exposure:false,raw_filesystem_url_exposure:false,mutation:false"
echo "local_path_exposure=false"
echo "retrieval_mutation=false"
echo "raw_filesystem_url_exposure=false"
echo "data_quality_mutation=false"
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
echo "VOID_PUBLIC_NODE_DATA_QUALITY_V1_GREEN"
