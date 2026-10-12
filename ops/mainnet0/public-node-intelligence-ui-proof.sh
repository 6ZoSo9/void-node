#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-intelligence-ui-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Intelligence UI v1 proof ==="
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
echo "=== [1] source markers/intelligence UI ==="
expect_grep "profile marker preserved" "VOID_PUBLIC_NODE_PROFILE_V1" src/index.ts
expect_grep "intelligence json marker preserved" "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1" src/index.ts
expect_grep "intelligence UI marker" "VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1" src/index.ts
expect_grep "intelligence UI script marker" "VOID_PUBLIC_NODE_INTELLIGENCE_UI_SCRIPT_V1" src/index.ts
expect_grep "json fetch" "/public-node/intelligence.json" src/index.ts
expect_grep "usefulness score id" "publicNodeUsefulnessScore" src/index.ts
expect_grep "proof count id" "publicNodeProofCount" src/index.ts
expect_grep "latest age id" "publicNodeLatestAge" src/index.ts
expect_grep "raw coverage id" "publicNodeRawCoverage" src/index.ts
expect_grep "latest task id" "publicNodeLatestTask" src/index.ts
expect_grep "next metrics id" "publicNodeNextMetrics" src/index.ts
expect_grep "intelligence JSON link id" "publicNodeIntelligenceJsonLink" src/index.ts
echo "[ok] source markers/intelligence UI"

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
echo "=== [4] public node UI renders intelligence dashboard ==="
expect_grep "public profile marker" "VOID_PUBLIC_NODE_PROFILE_V1" "$OUT/public-node.html"
expect_grep "public boundary marker" "VOID_PUBLIC_NODE_PRIVATE_BOUNDARY_V1" "$OUT/public-node.html"
expect_grep "intelligence UI marker" "VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1" "$OUT/public-node.html"
expect_grep "intelligence UI script marker" "VOID_PUBLIC_NODE_INTELLIGENCE_UI_SCRIPT_V1" "$OUT/public-node.html"
expect_grep "node intelligence title" "Node intelligence" "$OUT/public-node.html"
expect_grep "usefulness score copy" "Usefulness seed score" "$OUT/public-node.html"
expect_grep "proof count copy" "Public proof count" "$OUT/public-node.html"
expect_grep "latest age copy" "Latest proof age" "$OUT/public-node.html"
expect_grep "raw coverage copy" "Raw JSON coverage" "$OUT/public-node.html"
expect_grep "usefulness score id" "publicNodeUsefulnessScore" "$OUT/public-node.html"
expect_grep "proof count id" "publicNodeProofCount" "$OUT/public-node.html"
expect_grep "latest age id" "publicNodeLatestAge" "$OUT/public-node.html"
expect_grep "raw coverage id" "publicNodeRawCoverage" "$OUT/public-node.html"
expect_grep "latest task id" "publicNodeLatestTask" "$OUT/public-node.html"
expect_grep "next metrics id" "publicNodeNextMetrics" "$OUT/public-node.html"
expect_grep "intelligence JSON link" 'href="/public-node/intelligence.json"' "$OUT/public-node.html"
expect_grep "fetches intelligence json" "fetch('/public-node/intelligence.json'" "$OUT/public-node.html"
echo "[ok] public node UI renders intelligence dashboard"

echo
echo "=== [5] intelligence JSON still validates ==="
node "$OUT/intelligence.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1", "marker");
assert(j.route === "/public-node/intelligence.json", "route");
assert(Number.isFinite(j.proof_count), "proof_count");
assert(Number.isFinite(j.public_usefulness_seed_score), "score");
assert(j.safety && j.safety.read_only === true, "read only");
assert(j.public_private_boundary && j.public_private_boundary.owner_console_exposed === false, "owner console not exposed");
assert(Array.isArray(j.next_metrics), "next metrics");
console.log("proof_count=" + j.proof_count);
console.log("public_usefulness_seed_score=" + j.public_usefulness_seed_score);
console.log("latest_age_minutes=" + j.latest_age_minutes);
console.log("next_metrics=" + j.next_metrics.join(","));
NODE_VALIDATE
echo "[ok] intelligence JSON still validates"

echo
echo "=== [6] public/private boundary still holds ==="
reject_fixed "public node no form tags" "<form" "$OUT/public-node.html"
reject_fixed "public node no post method double quote" 'method="post' "$OUT/public-node.html"
reject_fixed "public node no post method single quote" "method='post" "$OUT/public-node.html"
reject_fixed "public node no action attr double quote" 'action="' "$OUT/public-node.html"
reject_fixed "public node no action attr single quote" "action='" "$OUT/public-node.html"
reject_fixed "public node no participant owner link" 'href="/participant' "$OUT/public-node.html"
reject_fixed "public node no private participant api" "/__void/participant" "$OUT/public-node.html"
reject_fixed "public node no buy void api" "/__void/buy-void" "$OUT/public-node.html"
reject_fixed "public node no proof mutation" "/wc-proof-demo/generate" "$OUT/public-node.html"
expect_grep "proof history remains reachable" "Recent verifiable Work Credit activity from this node" "$OUT/proofs.html"
echo "[ok] public/private boundary still holds"

echo
echo "=== close proof truth ==="
echo "route=/public-node"
echo "intelligence_route=/public-node/intelligence.json"
echo "profile_marker=VOID_PUBLIC_NODE_PROFILE_V1"
echo "json_marker=VOID_PUBLIC_NODE_INTELLIGENCE_JSON_V1"
echo "ui_marker=VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1"
echo "ui_script_marker=VOID_PUBLIC_NODE_INTELLIGENCE_UI_SCRIPT_V1"
echo "ui_fields=publicNodeUsefulnessScore,publicNodeProofCount,publicNodeLatestAge,publicNodeRawCoverage,publicNodeLatestTask,publicNodeNextMetrics"
echo "json_link_id=publicNodeIntelligenceJsonLink"
echo "visible_metrics=Usefulness seed score,Public proof count,Latest proof age,Raw JSON coverage,Latest task,Next metrics"
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
echo "VOID_PUBLIC_NODE_INTELLIGENCE_UI_V1_GREEN"
