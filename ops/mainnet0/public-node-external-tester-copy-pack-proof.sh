#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4143}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-external-tester-copy-pack-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node External Tester Copy Pack v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_DOC_V1" docs/public/public-node-external-tester-copy-pack.md
grep -Fq "/public-node/external-tester-copy-pack.json" src/index.ts

bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh
bash -n ops/mainnet0/public-node-route-manifest-proof.sh
bash -n ops/mainnet0/public-node-agent-discovery-proof.sh

npm run build
echo "[ok] source/docs/build/existing-proofs-updated"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4743
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
  if curl --max-time 10 -fsS "$BASE/public-node/external-tester-copy-pack.json" > "$OUT/external-tester-copy-pack.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl --max-time 10 -fsS "$BASE/.well-known/void-public-node.json" > "$OUT/agent-discovery.json"

node - "$OUT/external-tester-copy-pack.json" "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" "$OUT/agent-discovery.json" <<'NODE'
const fs = require("fs");
const pack = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const discovery = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(pack.marker === "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_V1", "pack marker");
ok(pack.purpose === "public_node_external_tester_copy_pack", "purpose");
ok(pack.status === "external_tester_copy_pack_ready", "status");
ok(pack.effective_base_url === "http://127.0.0.1:4143", "effective base");

ok(pack.copy_pack.public_node_url === "http://127.0.0.1:4143/public-node", "public node url");
ok(pack.copy_pack.well_known_discovery_url === "http://127.0.0.1:4143/.well-known/void-public-node.json", "well-known discovery url");
ok(pack.copy_pack.route_manifest_url === "http://127.0.0.1:4143/public-node/route-manifest.json", "route manifest url");
ok(pack.copy_pack.self_check_snapshot_url === "http://127.0.0.1:4143/public-node/self-check-snapshot.json", "self-check snapshot url");
ok(pack.copy_pack.outside_tester_smoke_url === "http://127.0.0.1:4143/public-node/outside-tester-smoke.json", "outside tester smoke url");
ok(pack.copy_pack.tester_bundle_url === "http://127.0.0.1:4143/public-node/tester-bundle.json", "tester bundle url");
ok(pack.copy_pack.tester_result_receipt_url === "http://127.0.0.1:4143/public-node/tester-result-receipt.json", "tester result receipt url");
ok(pack.copy_pack.proofs_url === "http://127.0.0.1:4143/proofs", "proofs url");
ok(pack.copy_pack.smoke_command === "PUBLIC_NODE_BASE=http://127.0.0.1:4143 ops/mainnet0/public-node-outside-tester-smoke.sh", "smoke command");
ok(pack.copy_pack.expected_green_marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "expected green marker");

ok(Array.isArray(pack.tester_instructions), "tester instructions array");
ok(pack.tester_instructions.length >= 5, "tester instructions length");

ok(pack.policy.public_routes_only === true, "public routes only");
ok(pack.policy.private_api === false, "private api false");
ok(pack.policy.mutation === false, "mutation false");
ok(pack.policy.read_only === true, "read only");
ok(pack.policy.money_movement === false, "no money movement");
ok(pack.policy.wallet_send === false, "no wallet send");
ok(pack.policy.wc_to_void_swap === false, "no wc swap");
ok(pack.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(pack.policy.validator_mutation === false, "no validator mutation");

ok(manifest.routes.some(r => r.path === "/public-node/external-tester-copy-pack.json" && r.marker === "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_V1"), "manifest has copy pack");
ok(manifest.route_count === 23, "manifest route count 15");
ok(snap.expected_routes.includes("/public-node/external-tester-copy-pack.json"), "self-check has copy pack");
ok(snap.expected_route_count === 23, "self-check route count 15");
ok(discovery.links.public_node === "http://127.0.0.1:4143/public-node", "discovery still valid");

console.log("[ok] json external tester copy pack");
NODE

grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_UI_V1" "$OUT/public-node.html"

echo "marker=VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_V1"
echo "route=/public-node/external-tester-copy-pack.json"
echo "ui_marker=VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_UI_V1"
echo "doc=docs/public/public-node-external-tester-copy-pack.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "status=external_tester_copy_pack_ready"
echo "route_manifest_route_count=23"
echo "self_check_expected_route_count=23"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_EXTERNAL_TESTER_COPY_PACK_V1_GREEN"
