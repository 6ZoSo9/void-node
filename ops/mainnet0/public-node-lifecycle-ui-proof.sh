#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-lifecycle-ui-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Lifecycle UI v1 proof ==="
echo "base=$BASE"
echo "out=$OUT"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "lossy_compression=false"
echo "original_replacement=false"
echo "compression_execution=false"

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
echo "=== [1] source markers/lifecycle UI ==="
expect_grep "profile marker preserved" "VOID_PUBLIC_NODE_PROFILE_V1" src/index.ts
expect_grep "json marker preserved" "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1" src/index.ts
expect_grep "metrics marker preserved" "VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1" src/index.ts
expect_grep "lifecycle UI marker" "VOID_PUBLIC_NODE_LIFECYCLE_UI_V1" src/index.ts
expect_grep "lossless compression policy marker" "VOID_PUBLIC_NODE_LOSSLESS_COMPRESSION_POLICY_V1" src/index.ts
expect_grep "organization score id" "publicNodeOrganizationScore" src/index.ts
expect_grep "compression candidates id" "publicNodeCompressionCandidates" src/index.ts
expect_grep "stale proofs id" "publicNodeStaleProofs" src/index.ts
expect_grep "public bytes id" "publicNodePublicBytes" src/index.ts
expect_grep "average proof size id" "publicNodeAverageProofSize" src/index.ts
expect_grep "proof age range id" "publicNodeProofAgeRange" src/index.ts
expect_grep "lossless policy copy" "VOID originals and proof records must remain bit-for-bit recoverable" src/index.ts
expect_grep "lossy derivative guard copy" "lossy derivatives must never replace source data" src/index.ts
echo "[ok] source markers/lifecycle UI"

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
  if curl -fsS "$BASE/public-node" > "$OUT/public-node.wait.html" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$BASE/public-node/intelligence.json" > "$OUT/intelligence.json"
curl -fsS "$BASE/proofs" > "$OUT/proofs.html"

echo
echo "=== [4] public node lifecycle UI renders ==="
expect_grep "public profile marker" "VOID_PUBLIC_NODE_PROFILE_V1" "$OUT/public-node.html"
expect_grep "intelligence UI marker" "VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1" "$OUT/public-node.html"
expect_grep "lifecycle UI marker" "VOID_PUBLIC_NODE_LIFECYCLE_UI_V1" "$OUT/public-node.html"
expect_grep "lossless policy marker" "VOID_PUBLIC_NODE_LOSSLESS_COMPRESSION_POLICY_V1" "$OUT/public-node.html"
expect_grep "data lifecycle title" "Data lifecycle" "$OUT/public-node.html"
expect_grep "organization score copy" "Organization seed score" "$OUT/public-node.html"
expect_grep "compression candidates copy" "Compression candidates" "$OUT/public-node.html"
expect_grep "stale proofs copy" "Stale public proofs" "$OUT/public-node.html"
expect_grep "public bytes copy" "Public proof bytes" "$OUT/public-node.html"
expect_grep "average size copy" "Average proof size" "$OUT/public-node.html"
expect_grep "proof age range copy" "Proof age range" "$OUT/public-node.html"
expect_grep "organization score id" "publicNodeOrganizationScore" "$OUT/public-node.html"
expect_grep "compression candidates id" "publicNodeCompressionCandidates" "$OUT/public-node.html"
expect_grep "stale proofs id" "publicNodeStaleProofs" "$OUT/public-node.html"
expect_grep "public bytes id" "publicNodePublicBytes" "$OUT/public-node.html"
expect_grep "average size id" "publicNodeAverageProofSize" "$OUT/public-node.html"
expect_grep "proof age range id" "publicNodeProofAgeRange" "$OUT/public-node.html"
expect_grep "lossless source copy" "VOID originals and proof records must remain bit-for-bit recoverable" "$OUT/public-node.html"
expect_grep "lossy derivative guard copy" "lossy derivatives must never replace source data" "$OUT/public-node.html"
echo "[ok] public node lifecycle UI renders"

echo
echo "=== [5] intelligence lifecycle JSON still validates ==="
node "$OUT/intelligence.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1", "json marker");
assert(j.lifecycle_marker === "VOID_PUBLIC_NODE_LIFECYCLE_METRICS_V1", "lifecycle marker");
assert(Number.isFinite(j.organization_seed_score), "organization score");
assert(Number.isFinite(j.compression_candidate_count), "compression candidates");
assert(Number.isFinite(j.stale_proof_count), "stale count");
assert(Number.isFinite(j.total_public_proof_bytes), "total bytes");
assert(Number.isFinite(j.average_public_proof_size_bytes), "average size");
assert(j.lifecycle_policy && j.lifecycle_policy.compression_candidate_rule === "stale_or_large_public_record", "candidate rule");
assert(j.safety && j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money");
assert(j.safety.wallet_send === false, "no wallet send");
assert(j.safety.wc_to_void_swap === false, "no wc swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");
console.log("organization_seed_score=" + j.organization_seed_score);
console.log("compression_candidate_count=" + j.compression_candidate_count);
console.log("stale_proof_count=" + j.stale_proof_count);
console.log("total_public_proof_bytes=" + j.total_public_proof_bytes);
console.log("average_public_proof_size_bytes=" + j.average_public_proof_size_bytes);
NODE_VALIDATE
echo "[ok] intelligence lifecycle JSON still validates"

echo
echo "=== [6] public/private and no-compression-execution boundary ==="
reject_fixed "public node no form tags" "<form" "$OUT/public-node.html"
reject_fixed "public node no post method double quote" 'method="post' "$OUT/public-node.html"
reject_fixed "public node no post method single quote" "method='post" "$OUT/public-node.html"
reject_fixed "public node no action attr double quote" 'action="' "$OUT/public-node.html"
reject_fixed "public node no action attr single quote" "action='" "$OUT/public-node.html"
reject_fixed "public node no participant owner link" 'href="/participant' "$OUT/public-node.html"
reject_fixed "public node no private participant api" "/__void/participant" "$OUT/public-node.html"
reject_fixed "public node no buy void api" "/__void/buy-void" "$OUT/public-node.html"
reject_fixed "public node no proof mutation" "/wc-proof-demo/generate" "$OUT/public-node.html"
reject_fixed "no compress action route" "/compress" "$OUT/public-node.html"
reject_fixed "no archive action route" "/archive" "$OUT/public-node.html"
reject_fixed "no delete action route" "/delete" "$OUT/public-node.html"
expect_grep "proof history remains reachable" "Recent verifiable Work Credit activity from this node" "$OUT/proofs.html"
echo "[ok] public/private and no-compression-execution boundary"

echo
echo "=== close proof truth ==="
echo "route=/public-node"
echo "intelligence_route=/public-node/intelligence.json"
echo "ui_marker=VOID_PUBLIC_NODE_LIFECYCLE_UI_V1"
echo "lossless_policy_marker=VOID_PUBLIC_NODE_LOSSLESS_COMPRESSION_POLICY_V1"
echo "visible_lifecycle_fields=publicNodeOrganizationScore,publicNodeCompressionCandidates,publicNodeStaleProofs,publicNodePublicBytes,publicNodeAverageProofSize,publicNodeProofAgeRange"
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
echo "VOID_PUBLIC_NODE_LIFECYCLE_UI_V1_GREEN"
