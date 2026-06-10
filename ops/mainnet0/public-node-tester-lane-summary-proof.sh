#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4148}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-tester-lane-summary-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Tester Lane Summary v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_DOC_V1" docs/public/public-node-tester-lane-summary.md
grep -Fq "/public-node/tester-lane-summary.json" src/index.ts

bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh
bash -n ops/mainnet0/public-node-route-manifest-proof.sh
bash -n ops/mainnet0/public-node-agent-discovery-proof.sh
bash -n ops/mainnet0/public-node-external-tester-copy-pack-proof.sh
bash -n ops/mainnet0/public-node-tester-result-intake-proof.sh
bash -n ops/mainnet0/public-node-standalone-outside-tester-smoke-proof.sh
bash -n ops/mainnet0/public-node-tester-share-page-proof.sh

npm run build
echo "[ok] source/docs/build/existing-proofs-updated"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4748
  export NODE_PRIVKEY_PATH="$OUT/nodeA.key"
  export PORT="${RUN_PORT}"
  export HTTP_PORT="${RUN_PORT}"
  export VOID_HTTP_PORT="${RUN_PORT}"
  export HOST=127.0.0.1
  export PUBLIC_NODE_EXTERNAL_BASE_URL="$BASE"
  npm start
) > "$OUT/server.log" 2>&1 &

PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/tester-lane-summary.json" > "$OUT/tester-lane-summary.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl --max-time 10 -fsS "$BASE/public-node/external-tester-copy-pack.json" > "$OUT/external-tester-copy-pack.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-share" > "$OUT/tester-share.html"

node - "$OUT/tester-lane-summary.json" "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" "$OUT/external-tester-copy-pack.json" "$OUT/tester-share.html" <<'NODE'
const fs = require("fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const pack = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const shareHtml = fs.readFileSync(process.argv[6], "utf8");

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(summary.marker === "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1", "summary marker");
ok(summary.purpose === "public_node_tester_lane_summary", "purpose");
ok(summary.status === "public_node_outside_tester_lane_ready", "status");
ok(summary.effective_base_url === "http://127.0.0.1:4148", "effective base");

ok(summary.tester_lane.tester_share_page_ready === true, "tester share ready");
ok(summary.tester_lane.standalone_smoke_script_ready === true, "standalone smoke ready");
ok(summary.tester_lane.copy_pack_ready === true, "copy pack ready");
ok(summary.tester_lane.result_receipt_schema_ready === true, "receipt schema ready");
ok(summary.tester_lane.result_intake_ready === true, "result intake ready");
ok(summary.tester_lane.import_helper_available === true, "import helper available");
ok(summary.tester_lane.agent_discovery_ready === true, "agent discovery ready");
ok(summary.tester_lane.route_manifest_ready === true, "route manifest ready");
ok(summary.tester_lane.self_check_snapshot_ready === true, "self-check ready");

ok(summary.links.tester_share_page === "http://127.0.0.1:4148/public-node/tester-share", "tester share link");
ok(summary.links.standalone_smoke_script === "http://127.0.0.1:4148/public-node/standalone-outside-tester-smoke.sh", "standalone smoke link");
ok(summary.links.external_tester_copy_pack === "http://127.0.0.1:4148/public-node/external-tester-copy-pack.json", "copy pack link");
ok(summary.links.tester_result_receipt_schema === "http://127.0.0.1:4148/public-node/tester-result-receipt.json", "receipt schema link");
ok(summary.links.tester_result_intake === "http://127.0.0.1:4148/public-node/tester-result-intake.json", "intake link");
ok(summary.links.agent_discovery === "http://127.0.0.1:4148/.well-known/void-public-node.json", "agent discovery link");
ok(summary.links.route_manifest === "http://127.0.0.1:4148/public-node/route-manifest.json", "manifest link");
ok(summary.links.self_check_snapshot === "http://127.0.0.1:4148/public-node/self-check-snapshot.json", "self-check link");
ok(summary.links.proofs === "http://127.0.0.1:4148/proofs", "proofs link");

ok(summary.local_operator_helper.script === "ops/mainnet0/public-node-import-tester-result.sh", "import helper script");
ok(summary.local_operator_helper.public_route === false, "import helper no public route");
ok(summary.local_operator_helper.operator_local_only === true, "import helper local only");

ok(summary.expected_green_marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "expected green marker");
ok(summary.expected_receipt_marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "expected receipt marker");
ok(summary.expected_receipt_file === "tester-receipt.json", "expected receipt file");

ok(summary.policy.public_routes_only === true, "public routes only");
ok(summary.policy.private_api === false, "private api false");
ok(summary.policy.public_post_endpoint === false, "public post false");
ok(summary.policy.operator_local_import_only === true, "operator local import only");
ok(summary.policy.mutation === false, "mutation false");
ok(summary.policy.read_only === true, "read only");
ok(summary.policy.money_movement === false, "money movement false");
ok(summary.policy.wallet_send === false, "wallet send false");
ok(summary.policy.wc_to_void_swap === false, "wc swap false");
ok(summary.policy.buy_void_fulfillment === false, "buy fulfillment false");
ok(summary.policy.validator_mutation === false, "validator mutation false");
ok(summary.policy.trusted_as_network_truth === false, "not network truth");

ok(manifest.routes.some(r => r.path === "/public-node/tester-lane-summary.json" && r.marker === "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1"), "manifest has tester lane summary");
ok(manifest.route_count === 20, "manifest route count 19");
ok(snap.expected_routes.includes("/public-node/tester-lane-summary.json"), "self-check has tester lane summary");
ok(snap.expected_route_count === 20, "self-check route count 19");
ok(pack.copy_pack.tester_lane_summary_url === "http://127.0.0.1:4148/public-node/tester-lane-summary.json", "copy pack lane summary url");
ok(shareHtml.includes("VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1"), "share page still present");

console.log("[ok] json tester lane summary");
NODE

grep -Fq "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_UI_V1" "$OUT/public-node.html"

echo "marker=VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1"
echo "route=/public-node/tester-lane-summary.json"
echo "ui_marker=VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_UI_V1"
echo "doc=docs/public/public-node-tester-lane-summary.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "status=public_node_outside_tester_lane_ready"
echo "tester_share_page_ready=true"
echo "standalone_smoke_script_ready=true"
echo "copy_pack_ready=true"
echo "result_receipt_schema_ready=true"
echo "result_intake_ready=true"
echo "import_helper_available=true"
echo "agent_discovery_ready=true"
echo "route_manifest_ready=true"
echo "self_check_snapshot_ready=true"
echo "route_manifest_route_count=20"
echo "self_check_expected_route_count=20"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "expected_receipt_marker=VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
echo "receipt_file=tester-receipt.json"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1_GREEN"
