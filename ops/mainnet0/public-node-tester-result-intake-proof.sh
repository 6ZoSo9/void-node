#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4144}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-tester-result-intake-v1-proof-$STAMP"
mkdir -p "$OUT/data/public-node/tester-result-intake"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Tester Result Intake v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_DOC_V1" docs/public/public-node-tester-result-intake.md
grep -Fq "/public-node/tester-result-intake.json" src/index.ts

bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh
bash -n ops/mainnet0/public-node-route-manifest-proof.sh
bash -n ops/mainnet0/public-node-agent-discovery-proof.sh
bash -n ops/mainnet0/public-node-external-tester-copy-pack-proof.sh

npm run build
echo "[ok] source/docs/build/existing-proofs-updated"

cat > "$OUT/data/public-node/tester-result-intake/latest.json" <<JSON
{
  "marker": "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1",
  "tester_label": "proof-fixture-outside-tester",
  "tested_base_url": "$BASE",
  "observed_green_marker": "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN",
  "result": "green",
  "imported_by_operator": true,
  "trusted_as_network_truth": false
}
JSON

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4744
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
  if curl --max-time 10 -fsS "$BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl --max-time 10 -fsS "$BASE/public-node/external-tester-copy-pack.json" > "$OUT/external-tester-copy-pack.json"

node - "$OUT/tester-result-intake.json" "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" "$OUT/external-tester-copy-pack.json" <<'NODE'
const fs = require("fs");
const intake = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const pack = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(intake.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1", "intake marker");
ok(intake.purpose === "public_node_tester_result_intake_status", "purpose");
ok(intake.status === "external_tester_result_imported", "status imported");
ok(intake.effective_base_url === "http://127.0.0.1:4144", "effective base");

ok(intake.intake.mode === "operator_local_file_import_only", "local import mode");
ok(intake.intake.public_post_endpoint === false, "no public post");
ok(intake.intake.import_path === "DATA_DIR/public-node/tester-result-intake/latest.json", "import path");
ok(intake.intake.latest_imported === true, "latest imported true");
ok(intake.intake.latest_result.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "receipt marker");
ok(intake.intake.latest_result.observed_green_marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "observed green marker");
ok(intake.intake.latest_result.trusted_as_network_truth === false, "not network truth");

ok(intake.expected_receipt_marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "expected receipt marker");
ok(intake.expected_smoke_green_marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "expected smoke green marker");

ok(intake.policy.public_routes_only === true, "public routes only");
ok(intake.policy.private_api === false, "private api false");
ok(intake.policy.public_post_endpoint === false, "public post false");
ok(intake.policy.operator_local_import_only === true, "operator local import only");
ok(intake.policy.mutation === false, "mutation false");
ok(intake.policy.read_only === true, "read only");
ok(intake.policy.money_movement === false, "no money movement");
ok(intake.policy.wallet_send === false, "no wallet send");
ok(intake.policy.wc_to_void_swap === false, "no wc swap");
ok(intake.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(intake.policy.validator_mutation === false, "no validator mutation");
ok(intake.policy.trusted_as_network_truth === false, "not trusted as network truth policy");

ok(manifest.routes.some(r => r.path === "/public-node/tester-result-intake.json" && r.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1"), "manifest has intake");
ok(manifest.route_count === 20, "manifest route count 16");
ok(snap.expected_routes.includes("/public-node/tester-result-intake.json"), "self-check has intake");
ok(snap.expected_route_count === 20, "self-check route count 16");
ok(pack.copy_pack.tester_result_receipt_url === "http://127.0.0.1:4144/public-node/tester-result-receipt.json", "copy pack still valid");

console.log("[ok] json tester result intake");
NODE

grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_UI_V1" "$OUT/public-node.html"

echo "marker=VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1"
echo "route=/public-node/tester-result-intake.json"
echo "ui_marker=VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_UI_V1"
echo "doc=docs/public/public-node-tester-result-intake.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "status=external_tester_result_imported"
echo "route_manifest_route_count=20"
echo "self_check_expected_route_count=20"
echo "expected_receipt_marker=VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "public_post_endpoint=false"
echo "operator_local_import_only=true"
echo "trusted_as_network_truth=false"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1_GREEN"
