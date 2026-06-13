#!/usr/bin/env bash
set -euo pipefail

: "${PUBLIC_NODE_BASE:?set PUBLIC_NODE_BASE, for example: PUBLIC_NODE_BASE=https://your-node.example}"

BASE="${PUBLIC_NODE_BASE%/}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-outside-tester-smoke-$STAMP}"
mkdir -p "$OUT"

echo "=== VOID Public Node Outside Tester Smoke v1 ==="
echo "base=$BASE"
echo "out=$OUT"

ROUTES=(
  "/public-node"
  "/public-node/share-link.json"
  "/public-node/tester-bundle.json"
  "/public-node/tester-loop-status.json"
  "/public-node/tester-result-receipt.json"
  "/public-node/quickstart.json"
  "/public-node/tester-handoff.json"
  "/public-node/public-exposure-smoke-pack.json"
  "/public-node/route-index.json"
  "/public-node/real-data-import-lane-status.json"
  "/proofs"
)

for route in "${ROUTES[@]}"; do
  name="$(printf '%s' "$route" | sed 's#^/##; s#[/?&=]#_#g')"
  curl --max-time 15 -fsS "$BASE$route" > "$OUT/$name"
  echo "ok $route"
done

node - "$OUT" <<'NODE'
const fs = require("fs");
const path = require("path");
const out = process.argv[2];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(out, name), "utf8"));
}

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

const share = readJson("public-node_share-link.json");
const bundle = readJson("public-node_tester-bundle.json");
const loop = readJson("public-node_tester-loop-status.json");
const receipt = readJson("public-node_tester-result-receipt.json");
const quick = readJson("public-node_quickstart.json");
const handoff = readJson("public-node_tester-handoff.json");
const smoke = readJson("public-node_public-exposure-smoke-pack.json");
const index = readJson("public-node_route-index.json");
const realDataStatus = readJson("public-node_real-data-import-lane-status.json");

ok(share.marker === "VOID_PUBLIC_NODE_SHARE_LINK_V1", "share marker");
ok(bundle.marker === "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1", "bundle marker");
ok(loop.marker === "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1", "loop status marker");
ok(loop.loop_ready === true, "loop ready");
ok(receipt.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "receipt marker");
ok(quick.marker === "VOID_PUBLIC_NODE_QUICKSTART_V1", "quickstart marker");
ok(handoff.marker === "VOID_PUBLIC_NODE_TESTER_HANDOFF_V1", "handoff marker");
ok(smoke.marker === "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1", "smoke pack marker");
ok(Array.isArray(index.routes), "route index routes");
ok(realDataStatus.marker === "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1", "real data status marker");
ok(typeof realDataStatus.real_data_lane_green === "boolean", "real data lane green boolean");
ok(typeof realDataStatus.verified_real_objects === "number", "real data verified objects number");
ok(realDataStatus.policy.public_upload === false, "real data no public upload");
ok(realDataStatus.policy.operator_local_import_only === true, "real data operator local import only");
ok(realDataStatus.policy.public_read_only === true, "real data public read only");
ok(realDataStatus.policy.trusted_as_network_truth === false, "real data not network truth");

console.log("[ok] public node outside tester json markers");
NODE

echo "public_node_base=$BASE"
echo "ok_routes=${#ROUTES[@]}"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
