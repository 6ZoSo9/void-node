#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4151}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-external-tester-receipt-closeout-status-ui-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node External Tester Receipt Closeout Status UI v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_UI_V1" src/index.ts
grep -Fq "publicNodeExternalTesterReceiptCloseoutStatusCard" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_UI_DOC_V1" docs/public/public-node-external-tester-receipt-closeout-status.md
grep -Fq "external_tester_receipt_closeout_status_green=true" docs/public/public-node-external-tester-receipt-closeout-status.md

bash -n ops/mainnet0/public-node-external-tester-receipt-closeout-status-proof.sh
bash -n ops/mainnet0/public-node-live-status-rollup.sh

npm run build
echo "[ok] source/docs/build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4751
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
  if curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node/external-tester-receipt-closeout-status.json" > "$OUT/closeout.json"

grep -Fq "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeExternalTesterReceiptCloseoutStatusCard" "$OUT/public-node.html"
grep -Fq "First outside tester receipt closeout" "$OUT/public-node.html"
grep -Fq "First outside tester receipt: <strong>waiting</strong>" "$OUT/public-node.html"
grep -Fq "Safe import guard: <strong>ready</strong>" "$OUT/public-node.html"
grep -Fq "Public upload: <strong>disabled</strong>" "$OUT/public-node.html"
grep -Fq "Operator-local import only: <strong>true</strong>" "$OUT/public-node.html"
grep -Fq "Network truth: <strong>false</strong>" "$OUT/public-node.html"
grep -Fq "/public-node/external-tester-receipt-closeout-status.json" "$OUT/public-node.html"
grep -Fq "external_tester_receipt_closeout_status_green=true" "$OUT/public-node.html"

node - "$OUT/closeout.json" <<'NODE'
const fs = require("fs");
const closeout = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(closeout.marker === "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1", "closeout marker");
ok(closeout.status === "waiting_for_external_tester_receipt", "waiting status");
ok(closeout.closeout.waiting_for_external_receipt === true, "waiting true");
ok(closeout.closeout.latest_imported === false, "latest imported false");
ok(closeout.closeout.safe_import_guard_ready === true, "safe import guard");
ok(closeout.policy.public_post_endpoint === false, "public post disabled");
ok(closeout.policy.operator_local_import_only === true, "operator local only");
ok(closeout.policy.trusted_as_network_truth === false, "not network truth");

console.log("[ok] closeout status backs UI");
NODE

echo "marker=VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_UI_V1"
echo "card_id=publicNodeExternalTesterReceiptCloseoutStatusCard"
echo "route=/public-node"
echo "json_route=/public-node/external-tester-receipt-closeout-status.json"
echo "doc=docs/public/public-node-external-tester-receipt-closeout-status.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "first_outside_tester_receipt=waiting"
echo "safe_import_guard=ready"
echo "public_upload=disabled"
echo "operator_local_import_only=true"
echo "network_truth=false"
echo "live_rollup_guard=external_tester_receipt_closeout_status_green=true"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_UI_V1_GREEN"
