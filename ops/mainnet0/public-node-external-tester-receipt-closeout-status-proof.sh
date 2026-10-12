#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4150}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-external-tester-receipt-closeout-status-v1-proof-$STAMP"
mkdir -p "$OUT/data/public-node/tester-result-intake"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node External Tester Receipt Closeout Status v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_DOC_V1" docs/public/public-node-external-tester-receipt-closeout-status.md
grep -Fq "/public-node/external-tester-receipt-closeout-status.json" src/index.ts

bash -n ops/mainnet0/public-node-tester-receipt-safe-import.sh
bash -n ops/mainnet0/public-node-tester-receipt-preflight.sh
bash -n ops/mainnet0/public-node-first-external-receipt-watch.sh
bash -n ops/mainnet0/public-node-live-status-rollup.sh

npm run build
echo "[ok] source/docs/build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4750
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
  if curl --max-time 10 -fsS "$BASE/public-node/external-tester-receipt-closeout-status.json" > "$OUT/closeout-waiting.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake-waiting.json"

node - "$OUT/closeout-waiting.json" "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" "$OUT/tester-result-intake-waiting.json" <<'NODE'
const fs = require("fs");
const closeout = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const intake = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(closeout.marker === "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1", "marker");
ok(closeout.purpose === "public_node_external_tester_receipt_closeout_status", "purpose");
ok(closeout.status === "waiting_for_external_tester_receipt", "waiting status");
ok(closeout.effective_base_url === "http://127.0.0.1:4150", "effective base");

ok(closeout.closeout.tester_lane_ready === true, "tester lane ready");
ok(closeout.closeout.receipt_required === true, "receipt required");
ok(closeout.closeout.waiting_for_external_receipt === true, "waiting true");
ok(closeout.closeout.latest_imported === false, "latest imported false");
ok(closeout.closeout.latest_receipt_present === false, "latest receipt false");
ok(closeout.closeout.expected_receipt_file === "tester-receipt.json", "receipt file");
ok(closeout.closeout.expected_receipt_marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "receipt marker");
ok(closeout.closeout.expected_green_marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "green marker");
ok(closeout.closeout.safe_import_guard_ready === true, "safe import guard");
ok(closeout.closeout.safe_import_script === "ops/mainnet0/public-node-tester-receipt-safe-import.sh", "safe import script");
ok(closeout.closeout.import_path === "DATA_DIR/public-node/tester-result-intake/latest.json", "import path");

ok(closeout.links.tester_result_intake === "http://127.0.0.1:4150/public-node/tester-result-intake.json", "intake link");
ok(closeout.links.real_data_import_lane_status === "http://127.0.0.1:4150/public-node/real-data-import-lane-status.json", "real data status link");

ok(closeout.policy.public_routes_only === true, "public routes only");
ok(closeout.policy.private_api === false, "private api false");
ok(closeout.policy.public_post_endpoint === false, "public post false");
ok(closeout.policy.operator_local_import_only === true, "operator local import only");
ok(closeout.policy.mutation === false, "mutation false");
ok(closeout.policy.read_only === true, "read only");
ok(closeout.policy.money_movement === false, "money false");
ok(closeout.policy.wallet_send === false, "wallet false");
ok(closeout.policy.wc_to_void_swap === false, "wc false");
ok(closeout.policy.buy_void_fulfillment === false, "buy false");
ok(closeout.policy.validator_mutation === false, "validator false");
ok(closeout.policy.trusted_as_network_truth === false, "not network truth");

ok(intake.status === "external_tester_result_waiting", "intake waiting");
ok(intake.intake.latest_imported === false, "intake latest imported false");

ok(manifest.routes.some(r => r.path === "/public-node/external-tester-receipt-closeout-status.json" && r.marker === "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1"), "manifest has closeout route");
ok(snap.expected_routes.includes("/public-node/external-tester-receipt-closeout-status.json"), "self check has closeout route");
ok(snap.links.external_tester_receipt_closeout_status === "http://127.0.0.1:4150/public-node/external-tester-receipt-closeout-status.json", "self check link");
ok(snap.checks.external_tester_receipt_closeout_status_present === true, "self check flag");

console.log("[ok] waiting closeout status");
NODE

cat > "$OUT/data/public-node/tester-result-intake/latest.json" <<'JSON'
{
  "marker": "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1",
  "result": "green",
  "observed_green_marker": "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN",
  "trusted_as_network_truth": false,
  "smoke_command_ok_routes": [
    "/public-node",
    "/public-node/tester-share",
    "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json"
  ]
}
JSON

curl --max-time 10 -fsS "$BASE/public-node/external-tester-receipt-closeout-status.json" > "$OUT/closeout-imported.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake-imported.json"

node - "$OUT/closeout-imported.json" "$OUT/tester-result-intake-imported.json" <<'NODE'
const fs = require("fs");
const closeout = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const intake = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(closeout.status === "external_tester_receipt_imported_closeout_ready", "imported closeout status");
ok(closeout.closeout.waiting_for_external_receipt === false, "waiting false");
ok(closeout.closeout.latest_imported === true, "latest imported true");
ok(closeout.closeout.latest_receipt_present === true, "latest receipt true");
ok(closeout.closeout.latest_result.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "latest marker");
ok(closeout.closeout.latest_result.trusted_as_network_truth === false, "latest not network truth");

ok(intake.status === "external_tester_result_imported", "intake imported");
ok(intake.intake.latest_imported === true, "intake latest imported true");
ok(intake.demo003_receipt_intake.latest_receipt_present === true, "demo003 receipt present");
ok(intake.demo003_receipt_intake.trusted_as_network_truth === false, "demo003 not network truth");

console.log("[ok] imported closeout status");
NODE

echo "marker=VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1"
echo "route=/public-node/external-tester-receipt-closeout-status.json"
echo "doc=docs/public/public-node-external-tester-receipt-closeout-status.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "waiting_status=waiting_for_external_tester_receipt"
echo "imported_status=external_tester_receipt_imported_closeout_ready"
echo "tester_lane_ready=true"
echo "receipt_required=true"
echo "safe_import_guard_ready=true"
echo "operator_local_import_only=true"
echo "public_upload=false"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1_GREEN"
