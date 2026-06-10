#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4141}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-route-manifest-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Route Manifest v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_ROUTE_MANIFEST_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_ROUTE_MANIFEST_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_ROUTE_MANIFEST_DOC_V1" docs/public/public-node-route-manifest.md
grep -Fq "/public-node/route-manifest.json" src/index.ts

bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh
grep -Fq "expected_route_count=22" ops/mainnet0/public-node-self-check-snapshot-proof.sh

npm run build
echo "[ok] source/docs/build/self-check-proof-updated"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4741
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
  if curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"

node - "$OUT/route-manifest.json" "$OUT/route-index.json" "$OUT/self-check-snapshot.json" <<'NODE'
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(manifest.marker === "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1", "manifest marker");
ok(manifest.purpose === "canonical_public_node_route_manifest", "purpose");
ok(manifest.status === "public_node_route_manifest_ready", "status");
ok(manifest.effective_base_url === "http://127.0.0.1:4141", "effective base");
ok(Array.isArray(manifest.routes), "routes array");
ok(manifest.route_count === manifest.routes.length, "route count matches");
ok(manifest.route_count === 22, "route count 14");

const required = [
  ["/.well-known/void-public-node.json", "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"],
  ["/public-node", "VOID_PUBLIC_NODE_PROFILE_ROUTE_V1"],
  ["/public-node/route-manifest.json", "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1"],
  ["/public-node/self-check-snapshot.json", "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1"],
  ["/public-node/share-link.json", "VOID_PUBLIC_NODE_SHARE_LINK_V1"],
  ["/public-node/tester-bundle.json", "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1"],
  ["/public-node/outside-tester-smoke.json", "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1"],
  ["/public-node/tester-loop-status.json", "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1"],
  ["/public-node/tester-result-receipt.json", "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"],
  ["/public-node/quickstart.json", "VOID_PUBLIC_NODE_QUICKSTART_V1"],
  ["/public-node/tester-handoff.json", "VOID_PUBLIC_NODE_TESTER_HANDOFF_V1"],
  ["/public-node/public-exposure-smoke-pack.json", "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1"],
  ["/public-node/route-index.json", "VOID_PUBLIC_NODE_ROUTE_INDEX_V1"],
  ["/proofs", "VOID_PUBLIC_PROOFS_INDEX_V1"]
];

for (const [path, marker] of required) {
  const row = manifest.routes.find(r => r.path === path);
  ok(row, "missing manifest route " + path);
  ok(row.marker === marker, "bad marker " + path);
  ok(row.safety_class === "public_read_only", "bad safety class " + path);
  ok(typeof row.purpose === "string" && row.purpose.length > 0, "missing purpose " + path);
}

ok(manifest.policy.public_routes_only === true, "public routes only");
ok(manifest.policy.read_only === true, "read only");
ok(manifest.policy.private_api === false, "no private api");
ok(manifest.policy.mutation === false, "no mutation");
ok(manifest.policy.money_movement === false, "no money movement");
ok(manifest.policy.wallet_send === false, "no wallet send");
ok(manifest.policy.wc_to_void_swap === false, "no wc swap");
ok(manifest.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(manifest.policy.validator_mutation === false, "no validator mutation");

ok(idx.routes.some(r => r.path === "/public-node/route-manifest.json" && r.marker === "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1"), "route index manifest entry");
ok(snap.marker === "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1", "self-check still works");
ok(snap.expected_route_count === 22, "self-check route count 14");
ok(snap.expected_routes.includes("/public-node/route-manifest.json"), "self-check includes manifest");
ok(snap.checks.route_manifest_present === true, "self-check manifest present");

console.log("[ok] json route manifest");
NODE

grep -Fq "VOID_PUBLIC_NODE_ROUTE_MANIFEST_UI_V1" "$OUT/public-node.html"
grep -Fq "/public-node/route-manifest.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_ROUTE_MANIFEST_DOC_V1" docs/public/public-node-route-manifest.md

echo "marker=VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1"
echo "route=/public-node/route-manifest.json"
echo "ui_marker=VOID_PUBLIC_NODE_ROUTE_MANIFEST_UI_V1"
echo "doc=docs/public/public-node-route-manifest.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "status=public_node_route_manifest_ready"
echo "route_count=22"
echo "self_check_expected_route_count=22"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1_GREEN"
