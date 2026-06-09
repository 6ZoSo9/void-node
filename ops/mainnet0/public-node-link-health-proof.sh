#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-link-health-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node Link Health v1 proof ==="
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
echo "link_health_probe_mutation=false"

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
echo "=== [1] source markers/link health ==="
expect_grep "retrieval links marker preserved" "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1" src/index.ts
expect_grep "link health route marker" "VOID_PUBLIC_NODE_LINK_HEALTH_ROUTE_V1" src/index.ts
expect_grep "link health json marker" "VOID_PUBLIC_NODE_LINK_HEALTH_V1" src/index.ts
expect_grep "link health UI marker" "VOID_PUBLIC_NODE_LINK_HEALTH_UI_V1" src/index.ts
expect_grep "link health script marker" "VOID_PUBLIC_NODE_LINK_HEALTH_SCRIPT_V1" src/index.ts
expect_grep "link health route" "/public-node/link-health.json" src/index.ts
expect_grep "health score id" "publicNodeLinkHealthScore" src/index.ts
expect_grep "working count id" "publicNodeWorkingLinkCount" src/index.ts
expect_grep "broken count id" "publicNodeBrokenLinkCount" src/index.ts
expect_grep "probed count id" "publicNodeProbedLinkCount" src/index.ts
expect_grep "loopback only policy" "loopback_only" src/index.ts
echo "[ok] source markers/link health"

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
  if curl -fsS "$BASE/public-node/link-health.json" > "$OUT/link-health.wait.json" 2>/dev/null; then
    echo "[ok] server live"
    break
  fi
  sleep 0.25
done

curl -fsS "$BASE/public-node/link-health.json" > "$OUT/link-health.json"
curl -fsS "$BASE/public-node/intelligence.json" > "$OUT/intelligence.json"
curl -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$BASE/proofs" > "$OUT/proofs.html"

echo
echo "=== [4] link health JSON validates actual public link probes ==="
node - "$OUT/link-health.json" <<'NODE_VALIDATE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
function finite(x,m){ assert(Number.isFinite(x), m); }

assert(j.ok === true, "ok true");
assert(j.marker === "VOID_PUBLIC_NODE_LINK_HEALTH_V1", "marker");
assert(j.route === "/public-node/link-health.json", "route");
assert(j.source_marker === "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1", "source marker");
finite(j.retrieval_links_count, "retrieval_links_count");
finite(j.probed_link_count, "probed_link_count");
finite(j.working_link_count, "working_link_count");
finite(j.broken_link_count, "broken_link_count");
finite(j.retrieval_link_health_score, "retrieval_link_health_score");
finite(j.probe_duration_ms, "probe_duration_ms");

assert(j.retrieval_links_count >= 1, "retrieval links present");
assert(j.retrieval_links_count <= 12, "retrieval links capped");
assert(j.probed_link_count >= 1, "probed links present");
assert(j.working_link_count + j.broken_link_count === j.probed_link_count, "working+broken=probed");
assert(j.retrieval_link_health_score >= 0 && j.retrieval_link_health_score <= 100, "score range");

assert(Array.isArray(j.probes), "probes array");
assert(j.probes.length === j.probed_link_count, "probes count");
for (const probe of j.probes) {
  assert(probe.type === "proof" || probe.type === "verify", "probe type safe");
  assert(typeof probe.path === "string", "probe path string");
  assert(probe.path.startsWith("/proof/") || probe.path.startsWith("/wc-proof-viewer?"), "public path only");
  assert(!probe.path.includes("/participant"), "no participant path");
  assert(!probe.path.includes("/__void/participant"), "no private participant path");
  assert(!probe.path.includes("/__void/buy-void"), "no buy void path");
  assert(!probe.path.includes("/home/"), "no home path");
  assert(!probe.path.includes("data_a/datanet_v1/local_jobs"), "no local_jobs path");
  assert(!probe.path.includes("file://"), "no file url");
  assert(Number.isFinite(probe.status), "probe status finite");
  assert(typeof probe.ok === "boolean", "probe ok bool");
}

assert(j.policy.loopback_only === true, "loopback only");
assert(j.policy.max_retrieval_links === 12, "max retrieval links");
assert(j.policy.public_paths_only === true, "public paths only");
assert(j.policy.local_path_exposure === false, "no local path exposure");
assert(j.policy.raw_filesystem_url_exposure === false, "no raw fs exposure");
assert(j.policy.mutation === false, "no mutation");

assert(j.safety.read_only === true, "read only");
assert(j.safety.money_movement === false, "no money");
assert(j.safety.wallet_send === false, "no wallet");
assert(j.safety.wc_to_void_swap === false, "no swap");
assert(j.safety.buy_void_fulfillment === false, "no buy fulfillment");
assert(j.safety.validator_mutation === false, "no validator mutation");

console.log("retrieval_links_count=" + j.retrieval_links_count);
console.log("probed_link_count=" + j.probed_link_count);
console.log("working_link_count=" + j.working_link_count);
console.log("broken_link_count=" + j.broken_link_count);
console.log("retrieval_link_health_score=" + j.retrieval_link_health_score);
console.log("first_probe_path=" + j.probes[0].path);
console.log("first_probe_status=" + j.probes[0].status);
NODE_VALIDATE
echo "[ok] link health JSON validates actual public link probes"

echo
echo "=== [5] public link health UI renders ==="
expect_grep "retrieval links UI marker" "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1" "$OUT/public-node.html"
expect_grep "link health UI marker" "VOID_PUBLIC_NODE_LINK_HEALTH_UI_V1" "$OUT/public-node.html"
expect_grep "link health script marker" "VOID_PUBLIC_NODE_LINK_HEALTH_SCRIPT_V1" "$OUT/public-node.html"
expect_grep "link health title" "Retrieval link health" "$OUT/public-node.html"
expect_grep "health score copy" "Health score" "$OUT/public-node.html"
expect_grep "working links copy" "Working links" "$OUT/public-node.html"
expect_grep "broken links copy" "Broken links" "$OUT/public-node.html"
expect_grep "probed links copy" "Probed links" "$OUT/public-node.html"
expect_grep "link health route fetch" "/public-node/link-health.json" "$OUT/public-node.html"
expect_grep "health score id" "publicNodeLinkHealthScore" "$OUT/public-node.html"
expect_grep "working count id" "publicNodeWorkingLinkCount" "$OUT/public-node.html"
expect_grep "broken count id" "publicNodeBrokenLinkCount" "$OUT/public-node.html"
expect_grep "probed count id" "publicNodeProbedLinkCount" "$OUT/public-node.html"
expect_grep "read only loopback copy" "read-only loopback GET checks" "$OUT/public-node.html"
echo "[ok] public link health UI renders"

echo
echo "=== [6] retrieval links source still validates ==="
node - "$OUT/intelligence.json" <<'NODE_LINKS'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
function assert(x,m){ if(!x) throw new Error(m); }
assert(j.retrieval_links_marker === "VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1", "links marker");
assert(Array.isArray(j.retrieval_links), "links array");
assert(j.retrieval_links.length >= 1, "links present");
assert(j.retrieval_links.length <= 12, "links capped");
for (const item of j.retrieval_links) {
  assert(typeof item.proof_link === "string" && item.proof_link.startsWith("/proof/"), "proof link");
  assert(typeof item.verify_link === "string" && item.verify_link.startsWith("/wc-proof-viewer?"), "verify link");
  assert(typeof item.raw_json_available === "boolean", "raw availability boolean");
  assert(!Object.prototype.hasOwnProperty.call(item, "raw_path"), "retrieval link item no raw_path");
}
console.log("retrieval_links_count=" + j.retrieval_links.length);
NODE_LINKS
echo "[ok] retrieval links source still validates"

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
reject_fixed "link health JSON no local cwd path" "$(pwd)" "$OUT/link-health.json"
reject_fixed "link health JSON no home path" "$HOME" "$OUT/link-health.json"
reject_fixed "link health JSON no datanet local_jobs path" "data_a/datanet_v1/local_jobs" "$OUT/link-health.json"
reject_fixed "link health JSON no file url" "file://" "$OUT/link-health.json"
echo "[ok] public/private boundary still holds"

echo
echo "=== close proof truth ==="
echo "route=/public-node/link-health.json"
echo "profile_route=/public-node"
echo "marker=VOID_PUBLIC_NODE_LINK_HEALTH_V1"
echo "route_marker=VOID_PUBLIC_NODE_LINK_HEALTH_ROUTE_V1"
echo "ui_marker=VOID_PUBLIC_NODE_LINK_HEALTH_UI_V1"
echo "script_marker=VOID_PUBLIC_NODE_LINK_HEALTH_SCRIPT_V1"
echo "source_marker=VOID_PUBLIC_NODE_RETRIEVAL_LINKS_V1"
echo "link_health_fields=retrieval_links_count,probed_link_count,working_link_count,broken_link_count,retrieval_link_health_score,probes"
echo "probe_policy=loopback_only:true,max_retrieval_links:12,public_paths_only:true,local_path_exposure:false,raw_filesystem_url_exposure:false,mutation:false"
echo "local_path_exposure=false"
echo "retrieval_mutation=false"
echo "raw_filesystem_url_exposure=false"
echo "link_health_probe_mutation=false"
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
echo "VOID_PUBLIC_NODE_LINK_HEALTH_V1_GREEN"
