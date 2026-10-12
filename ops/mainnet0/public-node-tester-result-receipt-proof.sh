#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4134}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-tester-result-receipt-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Tester Result Receipt v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_UI_V1" src/index.ts
grep -Fq "/public-node/tester-result-receipt.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_DOC_V1" docs/public/public-node-tester-result-receipt.md
echo "[ok] source/docs markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4734
  export NODE_PRIVKEY_PATH="$OUT/nodeA.key"
  export PORT="${RUN_PORT}"
  export HTTP_PORT="${RUN_PORT}"
  export VOID_HTTP_PORT="${RUN_PORT}"
  export HOST=127.0.0.1
  export PUBLIC_NODE_EXTERNAL_BASE_URL="https://example.void.test"
  npm start
) > "$OUT/server.log" 2>&1 &

PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/tester-result-receipt.json" > "$OUT/tester-result-receipt.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-handoff.json" > "$OUT/tester-handoff.json"

node - "$OUT/tester-result-receipt.json" "$OUT/route-index.json" "$OUT/tester-handoff.json" <<'NODE'
const fs = require("fs");
const receipt = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const handoff = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(receipt.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "receipt marker");
ok(receipt.purpose === "public_node_tester_result_receipt_template", "purpose");
ok(receipt.effective_base_url === "https://example.void.test", "effective external base URL");
ok(receipt.receipt_template && receipt.receipt_template.tested_node_url === "https://example.void.test", "tested node url");
ok(Array.isArray(receipt.receipt_template.smoke_command_ok_routes), "ok routes field");
ok(Array.isArray(receipt.receipt_template.smoke_command_failed_routes), "failed routes field");
ok(Array.isArray(receipt.expected_ok_routes), "expected ok routes");
ok(receipt.expected_ok_routes.includes("/public-node/tester-result-receipt.json"), "expected includes receipt");
ok(Array.isArray(receipt.report_back_format), "report back format");
ok(receipt.report_back_format.some(x => String(x).startsWith("node_url=")), "report node url");

ok(receipt.policy && receipt.policy.public_routes_only === true, "public routes only");
ok(receipt.policy && receipt.policy.read_only === true, "read only");
ok(receipt.policy && receipt.policy.money_movement === false, "no money movement");
ok(receipt.policy && receipt.policy.wallet_send === false, "no wallet send");
ok(receipt.policy && receipt.policy.wc_to_void_swap === false, "no wc swap");
ok(receipt.policy && receipt.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(receipt.policy && receipt.policy.validator_mutation === false, "no validator mutation");

ok(Array.isArray(idx.routes), "route index routes");
ok(idx.routes.some(r => r.path === "/public-node/tester-result-receipt.json" && r.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"), "route index receipt entry");
ok(handoff.marker === "VOID_PUBLIC_NODE_TESTER_HANDOFF_V1", "handoff still works");

console.log("[ok] json tester result receipt");
NODE

grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_UI_V1" "$OUT/public-node.html"
grep -Fq "/public-node/tester-result-receipt.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_DOC_V1" docs/public/public-node-tester-result-receipt.md

echo "marker=VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
echo "route=/public-node/tester-result-receipt.json"
echo "ui_marker=VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_UI_V1"
echo "doc=docs/public/public-node-tester-result-receipt.md"
echo "npm_start=true"
echo "external_base_url=https://example.void.test"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1_GREEN"
