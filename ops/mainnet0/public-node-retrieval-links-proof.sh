#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-retrieval-links-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Retrieval Links v1 proof ==="
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
echo "=== [1] source markers/retrieval links ==="
expect_grep "retrieval UI marker preserved" "VOID_PUBLIC_NODE_RETRIEVAL_UI_V1" src/index.ts
expect_grep "retrieval extraction marker preserved" "VOID_PUBLIC_NODE_RETRIEVAL_EXTRACTION_V1" src/index.ts
expect_grep "retrieval links marker" "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1" src/index.ts
expect_grep "retrieval links script marker" "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_SCRIPT_V1" src/index.ts
expect_grep "retrieval links field" "retrieval_links" src/index.ts
expect_grep "retrieval links count field" "retrieval_links_count" src/index.ts
expect_grep "retrieval links policy field" "retrieval_links_policy" src/index.ts
expect_grep "retrieval links list id" "publicNodeRetrievalLinksList" src/index.ts
expect_grep "proof link rule" "/proof/<dataset>?who=<who>&delta=10" src/index.ts
expect_grep "verify link rule" "/wc-proof-viewer?dataset=<dataset>&who=<who>&delta=10" src/index.ts
echo "[ok] source markers/retrieval links"

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
echo "=== [4] retrieval links JSON validates ==="
node - "$OUT/intelligence.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
function finite(x,m){ assert(Number.isFinite(x), m); }

assert(j.ok === true, "ok true");
assert(j.retrieval_extraction_marker === "VOID_PUBLIC_NODE_RETRIEVAL_EXTRACTION_V1", "retrieval extraction marker");
assert(j.retrieval_links_marker === "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1", "retrieval links marker");
finite(j.retrieval_links_count, "retrieval_links_count");
assert(Array.isArray(j.retrieval_links), "retrieval_links array");
assert(j.retrieval_links.length === j.retrieval_links_count, "links count matches");
assert(j.retrieval_links.length >= 1, "at least one retrieval link");
assert(j.retrieval_links.length <= 12, "retrieval links capped");

assert(j.retrieval_links_policy && j.retrieval_links_policy.max_items === 12, "max 12");
assert(j.retrieval_links_policy.public_identifiers_only === true, "public identifiers only");
assert(j.retrieval_links_policy.local_path_exposure === false, "no local path exposure policy");
assert(j.retrieval_links_policy.raw_filesystem_url_exposure === false, "no raw filesystem URL policy");
assert(j.retrieval_links_policy.mutation === false, "no mutation policy");

for (const item of j.retrieval_links) {
  assert(item && Number.isFinite(item.index), "item index");
  assert(typeof item.dataset === "string" && item.dataset.startsWith("ds_"), "dataset safe");
  assert(typeof item.who === "string" && item.who.length >= 4, "who safe");
  assert(typeof item.task === "string" && item.task.length >= 1, "task label");
  assert(typeof item.proof_link === "string" && item.proof_link.startsWith("/proof/"), "proof link");
  assert(typeof item.verify_link === "string" && item.verify_link.startsWith("/wc-proof-viewer?"), "verify link");
  assert(typeof item.share_link === "string" && item.share_link.startsWith("/proof/"), "share link");
  assert(typeof item.raw_json_available === "boolean", "raw availability boolean");
  assert(!Object.prototype.hasOwnProperty.call(item, "raw_path"), "no raw_path field");
  assert(!Object.prototype.hasOwnProperty.call(item, "path"), "no path field");
  const blob = JSON.stringify(item);
  assert(!blob.includes("/home/"), "no home path in item");
  assert(!blob.includes("data_a/datanet_v1/local_jobs"), "no local_jobs path in item");
  assert(!blob.includes(".."), "no traversal in item");
}

finite(j.retrieval_seed_score, "retrieval seed score");
assert(j.retrieval_seed_score > 20, "retrieval score above baseline");
assert(j.dataset_extraction_count >= 1, "dataset extraction present");
assert(j.who_extraction_count >= 1, "who extraction present");
assert(j.recent_proof_link_count >= 1, "proof candidates present");
assert(j.verifier_link_count >= 1, "verifier candidates present");
assert(j.share_link_count >= 1, "share candidates present");

assert(j.safety && j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money");
assert(j.safety.wallet_send === false, "no wallet send");
assert(j.safety.wc_to_void_swap === false, "no wc swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");

console.log("retrieval_links_count=" + j.retrieval_links_count);
console.log("first_dataset=" + j.retrieval_links[0].dataset);
console.log("first_who=" + j.retrieval_links[0].who);
console.log("first_proof_link=" + j.retrieval_links[0].proof_link);
console.log("first_verify_link=" + j.retrieval_links[0].verify_link);
console.log("retrieval_seed_score=" + j.retrieval_seed_score);
NODE_VALIDATE
echo "[ok] retrieval links JSON validates"

echo
echo "=== [5] public retrieval links UI renders ==="
expect_grep "retrieval UI marker" "VOID_PUBLIC_NODE_RETRIEVAL_UI_V1" "$OUT/public-node.html"
expect_grep "retrieval links marker" "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1" "$OUT/public-node.html"
expect_grep "retrieval links script marker" "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_SCRIPT_V1" "$OUT/public-node.html"
expect_grep "top links title" "Top public retrieval links" "$OUT/public-node.html"
expect_grep "links list id" "publicNodeRetrievalLinksList" "$OUT/public-node.html"
expect_grep "raw availability copy" "Raw JSON is shown as availability only" "$OUT/public-node.html"
expect_grep "proof action copy" "Proof" "$OUT/public-node.html"
expect_grep "verify action copy" "Verify" "$OUT/public-node.html"
expect_grep "share action copy" "Share" "$OUT/public-node.html"
echo "[ok] public retrieval links UI renders"

echo
echo "=== [6] public/private boundary still holds ==="
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
node - "$OUT/intelligence.json" <<'NODE_RAW_SCOPE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }

assert(Array.isArray(j.retrieval_links), "retrieval_links array");
for (const item of j.retrieval_links) {
  assert(!Object.prototype.hasOwnProperty.call(item, "raw_path"), "retrieval link no raw_path");
  assert(!Object.prototype.hasOwnProperty.call(item, "path"), "retrieval link no path");
  assert(!Object.prototype.hasOwnProperty.call(item, "file"), "retrieval link no file");
  assert(!Object.prototype.hasOwnProperty.call(item, "file_path"), "retrieval link no file_path");

  const blob = JSON.stringify(item);
  assert(!blob.includes("/home/"), "retrieval link no home path");
  assert(!blob.includes("data_a/datanet_v1/local_jobs"), "retrieval link no local_jobs path");
  assert(!blob.includes("file://"), "retrieval link no file url");
}

console.log("retrieval_links_raw_path_scope=links_only_clean");
NODE_RAW_SCOPE
echo "[ok] public/private boundary still holds"

echo
echo "=== close proof truth ==="
echo "route=/public-node"
echo "intelligence_route=/public-node/intelligence.json"
echo "marker=VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1"
echo "script_marker=VOID_PUBLIC_NODE_RETRIEVAL_LINKS_SCRIPT_V1"
echo "retrieval_links_fields=dataset,who,task,proof_link,verify_link,share_link,raw_json_available"
echo "retrieval_links_policy=max_items:12,public_identifiers_only:true,local_path_exposure:false,raw_filesystem_url_exposure:false,mutation:false"
echo "raw_json_exposure=availability_boolean_only"
echo "local_path_exposure=false"
echo "retrieval_mutation=false"
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
echo "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1_GREEN"
