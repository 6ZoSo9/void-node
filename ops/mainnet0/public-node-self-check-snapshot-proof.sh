#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4140}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-self-check-snapshot-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Self-Check Snapshot v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_DOC_V1" docs/public/public-node-self-check-snapshot.md
grep -Fq "/public-node/self-check-snapshot.json" src/index.ts

npm run build
echo "[ok] source/docs/build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4740
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
  if curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/outside-tester-smoke.json" > "$OUT/outside-tester-smoke.json"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"

node - "$OUT/self-check-snapshot.json" "$OUT/route-index.json" "$OUT/outside-tester-smoke.json" "$OUT/route-manifest.json" "$BASE" <<'NODE'
const fs = require("fs");
const snap = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const smoke = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const base = process.argv[6];

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(snap.marker === "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1", "snapshot marker");
ok(snap.purpose === "public_node_self_check_snapshot", "purpose");
ok(snap.status === "public_node_externally_testable_read_only_surface_ready", "status");
ok(snap.effective_base_url === base, "effective base");
ok(Array.isArray(snap.expected_routes), "expected routes array");
ok(snap.expected_route_count === snap.expected_routes.length, "route count matches");
ok(new Set(snap.expected_routes).size === snap.expected_routes.length, "expected routes unique");

const required = [
  "/.well-known/void-public-node.json",
  "/public-node/external-tester-copy-pack.json",
  "/public-node/tester-result-intake.json",
  "/public-node/standalone-outside-tester-smoke.sh",
  "/public-node/tester-share",
  "/public-node/tester-lane-summary.json",
  "/public-node/first-tester-request-copy-pack.json",
  "/public-node/local-data-drop/manifest.json",
  "/public-node/local-data-drop.json",
  "/public-node/local-data-drop/proof/:sha256.json",
  "/public-node/local-data-drop/by-sha256/:sha256",
  "/public-node/local-data-drop/:objectId",
  "/public-node",
  "/public-node/self-check-snapshot.json",
  "/public-node/route-manifest.json",
  "/public-node/share-link.json",
  "/public-node/tester-bundle.json",
  "/public-node/outside-tester-smoke.json",
  "/public-node/tester-loop-status.json",
  "/public-node/tester-result-receipt.json",
  "/public-node/quickstart.json",
  "/public-node/tester-handoff.json",
  "/public-node/public-exposure-smoke-pack.json",
  "/public-node/route-index.json",
  "/proofs"
];

for (const route of required) ok(snap.expected_routes.includes(route), "missing " + route);

ok(snap.links.agent_discovery === base + "/.well-known/void-public-node.json", "agent discovery link");
ok(snap.links.public_node === base + "/public-node", "public node link");
ok(snap.links.route_index === base + "/public-node/route-index.json", "route index link");
ok(snap.links.route_manifest === base + "/public-node/route-manifest.json", "route manifest link");
ok(snap.links.smoke_surface === base + "/public-node/outside-tester-smoke.json", "smoke surface link");
ok(snap.links.proofs === base + "/proofs", "proofs link");

ok(snap.checks.self_check_snapshot === true, "self check true");
ok(snap.checks.agent_discovery_present === true, "agent discovery present");
ok(snap.checks.route_index_present === true, "route index present");
ok(snap.checks.route_manifest_present === true, "route manifest present");
ok(snap.checks.outside_tester_smoke_surface_present === true, "smoke surface present");
ok(snap.checks.externally_testable === true, "externally testable");

ok(snap.policy.public_routes_only === true, "public routes only");
ok(snap.policy.read_only === true, "read only");
ok(snap.policy.private_api === false, "no private api");
ok(snap.policy.mutation === false, "no mutation");
ok(snap.policy.money_movement === false, "no money movement");
ok(snap.policy.wallet_send === false, "no wallet send");
ok(snap.policy.wc_to_void_swap === false, "no wc swap");
ok(snap.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(snap.policy.validator_mutation === false, "no validator mutation");

ok(idx.routes.some(r => r.path === "/public-node/self-check-snapshot.json" && r.marker === "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1"), "route index self-check entry");
ok(smoke.marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_SURFACE_V1", "smoke surface still works");

ok(manifest.marker === "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1", "route manifest marker");
ok(Array.isArray(manifest.routes), "route manifest routes");
ok(manifest.route_count === manifest.routes.length, "manifest route count matches");
const manifestPaths = manifest.routes.map((row) => row && row.path);
ok(new Set(manifestPaths).size === manifestPaths.length, "manifest routes unique");
for (const route of snap.expected_routes) {
  ok(manifestPaths.includes(route), "self-check route missing from canonical manifest: " + route);
}
ok(manifest.routes.length >= snap.expected_routes.length, "canonical manifest must cover self-check core");

console.log("[ok] json self-check snapshot");
NODE

grep -Fq "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_UI_V1" "$OUT/public-node.html"
grep -Fq "/public-node/self-check-snapshot.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_DOC_V1" docs/public/public-node-self-check-snapshot.md

SELF_ROUTE_COUNT="$(node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(d.expected_routes.length));' "$OUT/self-check-snapshot.json")"
MANIFEST_ROUTE_COUNT="$(node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(d.routes.length));' "$OUT/route-manifest.json")"

echo "marker=VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1"
echo "route=/public-node/self-check-snapshot.json"
echo "ui_marker=VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_UI_V1"
echo "doc=docs/public/public-node-self-check-snapshot.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "status=public_node_externally_testable_read_only_surface_ready"
echo "expected_route_count=$SELF_ROUTE_COUNT"
echo "canonical_manifest_route_count=$MANIFEST_ROUTE_COUNT"
echo "expected_routes_subset_of_manifest=true"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1_GREEN"
