#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4142}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-agent-discovery-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Agent Discovery v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_AGENT_DISCOVERY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_AGENT_DISCOVERY_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_AGENT_DISCOVERY_DOC_V1" docs/public/public-node-agent-discovery.md
grep -Fq "/.well-known/void-public-node.json" src/index.ts

bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh
bash -n ops/mainnet0/public-node-route-manifest-proof.sh
grep -Fq "expected_route_count=14" ops/mainnet0/public-node-self-check-snapshot-proof.sh
grep -Fq "route_count=14" ops/mainnet0/public-node-route-manifest-proof.sh
grep -Fq "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1" ops/mainnet0/public-node-route-manifest-proof.sh

npm run build
echo "[ok] source/docs/build/existing-proofs-updated"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4742
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
  if curl --max-time 10 -fsS "$BASE/.well-known/void-public-node.json" > "$OUT/agent-discovery.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"

node - "$OUT/agent-discovery.json" "$OUT/route-index.json" "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" <<'NODE'
const fs = require("fs");
const discovery = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(discovery.marker === "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1", "discovery marker");
ok(discovery.purpose === "well_known_public_node_agent_discovery", "purpose");
ok(discovery.protocol === "void-public-node-discovery-v1", "protocol");
ok(discovery.status === "public_node_agent_discovery_ready", "status");
ok(discovery.effective_base_url === "http://127.0.0.1:4142", "effective base");

ok(discovery.links.public_node === "http://127.0.0.1:4142/public-node", "public node link");
ok(discovery.links.route_manifest === "http://127.0.0.1:4142/public-node/route-manifest.json", "route manifest link");
ok(discovery.links.self_check_snapshot === "http://127.0.0.1:4142/public-node/self-check-snapshot.json", "self check link");
ok(discovery.links.outside_tester_smoke === "http://127.0.0.1:4142/public-node/outside-tester-smoke.json", "smoke link");
ok(discovery.links.tester_bundle === "http://127.0.0.1:4142/public-node/tester-bundle.json", "tester bundle link");
ok(discovery.links.result_receipt === "http://127.0.0.1:4142/public-node/tester-result-receipt.json", "result receipt link");
ok(discovery.links.proofs === "http://127.0.0.1:4142/proofs", "proofs link");

ok(discovery.policy.public_routes_only === true, "public routes only");
ok(discovery.policy.read_only === true, "read only");
ok(discovery.policy.private_api === false, "no private api");
ok(discovery.policy.mutation === false, "no mutation");
ok(discovery.policy.money_movement === false, "no money movement");
ok(discovery.policy.wallet_send === false, "no wallet send");
ok(discovery.policy.wc_to_void_swap === false, "no wc swap");
ok(discovery.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(discovery.policy.validator_mutation === false, "no validator mutation");

ok(idx.routes.some(r => r.path === "/.well-known/void-public-node.json" && r.marker === "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"), "route index discovery entry");

const manifestRow = manifest.routes.find(r => r.path === "/.well-known/void-public-node.json");
ok(manifest.marker === "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1", "manifest still works");
ok(manifest.route_count === 14, "manifest route count 14");
ok(manifestRow, "manifest discovery row");
ok(manifestRow.marker === "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1", "manifest discovery marker");
ok(manifestRow.safety_class === "public_read_only", "manifest discovery safety class");

ok(snap.marker === "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1", "self-check still works");
ok(snap.expected_route_count === 14, "self-check route count 14");
ok(snap.expected_routes.includes("/.well-known/void-public-node.json"), "self-check includes discovery");
ok(snap.links.agent_discovery === "http://127.0.0.1:4142/.well-known/void-public-node.json", "self-check discovery link");
ok(snap.checks.agent_discovery_present === true, "self-check discovery present");

console.log("[ok] json agent discovery");
NODE

grep -Fq "VOID_PUBLIC_NODE_AGENT_DISCOVERY_UI_V1" "$OUT/public-node.html"
grep -Fq "/.well-known/void-public-node.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_AGENT_DISCOVERY_DOC_V1" docs/public/public-node-agent-discovery.md

echo "marker=VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"
echo "route=/.well-known/void-public-node.json"
echo "ui_marker=VOID_PUBLIC_NODE_AGENT_DISCOVERY_UI_V1"
echo "doc=docs/public/public-node-agent-discovery.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "status=public_node_agent_discovery_ready"
echo "protocol=void-public-node-discovery-v1"
echo "route_manifest_route_count=14"
echo "self_check_expected_route_count=14"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1_GREEN"
