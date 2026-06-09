#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-profile-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Profile v1 proof ==="
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

reject_grep(){
  local name="$1"
  local pattern="$2"
  local file="$3"
  local err="$OUT/reject-grep-error-$(echo "$name" | tr -c 'A-Za-z0-9_' '_').log"

  set +e
  grep -Eiq "$pattern" "$file" 2>"$err"
  local rc="$?"
  set -e

  if [ "$rc" -eq 0 ]; then
    echo "[fail] $name matched forbidden pattern: $pattern"
    grep -Ein "$pattern" "$file" || true
    exit 1
  elif [ "$rc" -eq 1 ]; then
    echo "[ok] $name"
  else
    echo "[fail] $name grep pattern error: $pattern"
    cat "$err" || true
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
echo "=== [1] source markers/public node profile ==="
expect_grep "route marker" "VOID_PUBLIC_NODE_PROFILE_ROUTE_V1" src/index.ts
expect_grep "profile marker" "VOID_PUBLIC_NODE_PROFILE_V1" src/index.ts
expect_grep "read only marker" "VOID_PUBLIC_NODE_PROFILE_READ_ONLY_V1" src/index.ts
expect_grep "identity card marker" "VOID_PUBLIC_NODE_IDENTITY_CARD_V1" src/index.ts
expect_grep "proof stats marker" "VOID_PUBLIC_NODE_PROOF_STATS_V1" src/index.ts
expect_grep "boundary marker" "VOID_PUBLIC_NODE_PRIVATE_BOUNDARY_V1" src/index.ts
expect_grep "data intelligence marker" "VOID_PUBLIC_NODE_DATA_INTELLIGENCE_SEED_V1" src/index.ts
expect_grep "script marker" "VOID_PUBLIC_NODE_PROFILE_SCRIPT_V1" src/index.ts
expect_grep "public route" 'APP.get("/public-node"' src/index.ts
expect_grep "latest proof endpoint" "/wc-proofs/latest?limit=12" src/index.ts
expect_grep "proof history link" 'href="/proofs"' src/index.ts
expect_grep "read-only copy" "This node exposes proofs, not controls." src/index.ts
expect_grep "data intelligence copy" "node effectiveness, data importance, staleness, compression, organization, and retrieval scoring" src/index.ts
echo "[ok] source markers/public node profile"

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
curl -fsS "$BASE/wc-proofs/latest?limit=12" > "$OUT/latest-twelve.json"

echo
echo "=== [4] public node page renders safe public profile ==="
expect_grep "html profile page id" 'id="publicNodeProfilePage"' "$OUT/public-node.html"
expect_grep "html profile marker" "VOID_PUBLIC_NODE_PROFILE_V1" "$OUT/public-node.html"
expect_grep "html read-only marker" "VOID_PUBLIC_NODE_PROFILE_READ_ONLY_V1" "$OUT/public-node.html"
expect_grep "html identity marker" "VOID_PUBLIC_NODE_IDENTITY_CARD_V1" "$OUT/public-node.html"
expect_grep "html proof stats marker" "VOID_PUBLIC_NODE_PROOF_STATS_V1" "$OUT/public-node.html"
expect_grep "html boundary marker" "VOID_PUBLIC_NODE_PRIVATE_BOUNDARY_V1" "$OUT/public-node.html"
expect_grep "html data intelligence marker" "VOID_PUBLIC_NODE_DATA_INTELLIGENCE_SEED_V1" "$OUT/public-node.html"
expect_grep "html script marker" "VOID_PUBLIC_NODE_PROFILE_SCRIPT_V1" "$OUT/public-node.html"
expect_grep "proof stats summary id" "publicNodeProofSummary" "$OUT/public-node.html"
expect_grep "latest proof id" "publicNodeLatestProof" "$OUT/public-node.html"
expect_grep "latest proof link id" "publicNodeLatestProofLink" "$OUT/public-node.html"
expect_grep "latest raw link id" "publicNodeLatestRawLink" "$OUT/public-node.html"
expect_grep "history link id" "publicNodeProofHistoryLink" "$OUT/public-node.html"
expect_grep "proof history route" 'href="/proofs"' "$OUT/public-node.html"
expect_grep "latest proof endpoint" "/wc-proofs/latest?limit=12" "$OUT/public-node.html"
expect_grep "read-only safety copy" "no wallet send, no WC→VOID swap, no Buy VOID fulfillment, no staking action, no validator mutation, no admin control" "$OUT/public-node.html"
echo "[ok] public node page renders safe public profile"

echo
echo "=== [5] public/private boundary checks ==="
reject_fixed "no form tags" "<form" "$OUT/public-node.html"
reject_fixed "no post method double quote" 'method="post' "$OUT/public-node.html"
reject_fixed "no post method single quote" "method='post" "$OUT/public-node.html"
reject_fixed "no action attribute double quote" 'action="' "$OUT/public-node.html"
reject_fixed "no action attribute single quote" "action='" "$OUT/public-node.html"
reject_fixed "no participant owner-console link double quote" 'href="/participant' "$OUT/public-node.html"
reject_fixed "no participant owner-console link single quote" "href='/participant" "$OUT/public-node.html"
reject_fixed "no private participant api path" "/__void/participant" "$OUT/public-node.html"
reject_fixed "no buy void private api path" "/__void/buy-void" "$OUT/public-node.html"
reject_fixed "no buy void public link double quote" 'href="/buy-void' "$OUT/public-node.html"
reject_fixed "no buy void public link single quote" "href='/buy-void" "$OUT/public-node.html"
reject_fixed "no stake next-onboard mutation" "stake/next-onboard" "$OUT/public-node.html"
reject_fixed "no validator submit mutation" "validator-registration/submit" "$OUT/public-node.html"
reject_fixed "no submit-live mutation" "submit-live" "$OUT/public-node.html"
reject_fixed "no proof generation mutation" "/wc-proof-demo/generate" "$OUT/public-node.html"
echo "[ok] public/private boundary checks"

echo
echo "=== [6] latest proof source parseable ==="
node "$OUT/latest-twelve.json" <<'NODE_PARSE'
const fs = require("fs");
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
let items = j.items || j.proofs || j.latest || [];
if (!Array.isArray(items)) items = items ? [items] : [];
if (!items.length) throw new Error("no latest public proofs found");
const latest = items[0];
const dataset = latest.dataset_id || latest.dataset || latest.id || "";
const who = latest.who || latest.account || "";
const task = latest.task_class || latest.taskClass || "work_credit_activity";
const viewer = latest.viewer_path || latest.viewerPath || latest.viewer || "";
const raw = latest.raw_path || latest.rawPath || latest.raw || "";
if (!dataset) throw new Error("latest proof missing dataset");
if (!viewer && !dataset) throw new Error("latest proof missing viewer/dataset");
if (!raw && !dataset) throw new Error("latest proof missing raw/dataset");
console.log("public_node_latest_count=" + items.length);
console.log("public_node_latest_dataset=" + dataset);
console.log("public_node_latest_who=" + who);
console.log("public_node_latest_task=" + task);
console.log("public_node_latest_viewer=" + viewer);
console.log("public_node_latest_raw=" + raw);
NODE_PARSE
echo "[ok] latest proof source parseable"

echo
echo "=== [7] public proof stack still reachable ==="
curl -fsS "$BASE/proofs" > "$OUT/proofs.html"
expect_grep "proofs history title" "Recent verifiable Work Credit activity from this node" "$OUT/proofs.html"
expect_grep "proofs raw JSON action" "Open latest raw JSON" "$OUT/proofs.html"
echo "[ok] public proof stack reachable"

echo
echo "=== close proof truth ==="
echo "route=/public-node"
echo "public_profile_marker=VOID_PUBLIC_NODE_PROFILE_V1"
echo "public_profile_script_marker=VOID_PUBLIC_NODE_PROFILE_SCRIPT_V1"
echo "public_identity_card_id=publicNodeIdentityCard"
echo "public_proof_stats_card_id=publicNodeProofStatsCard"
echo "public_boundary_card_id=publicNodeBoundaryCard"
echo "public_data_intelligence_card_id=publicNodeDataIntelligenceCard"
echo "latest_endpoint=/wc-proofs/latest?limit=12"
echo "history_route=/proofs"
echo "owner_console_route=/participant"
echo "owner_console_exposed=false"
echo "forms_present=false"
echo "proof_generation_mutation_exposed=false"
echo "private_participant_api_exposed=false"
echo "buy_void_controls_exposed=false"
echo "stake_mutation_exposed=false"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_PROFILE_V1_GREEN"
