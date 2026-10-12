#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4135}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-tester-bundle-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Tester Bundle v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_TESTER_BUNDLE_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_BUNDLE_UI_V1" src/index.ts
grep -Fq "/public-node/tester-bundle.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_BUNDLE_DOC_V1" docs/public/public-node-tester-bundle.md
echo "[ok] source/docs markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4735
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
  if curl --max-time 10 -fsS "$BASE/public-node/tester-bundle.json" > "$OUT/tester-bundle.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/quickstart.json" > "$OUT/quickstart.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-handoff.json" > "$OUT/tester-handoff.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-result-receipt.json" > "$OUT/tester-result-receipt.json"

node - "$OUT/tester-bundle.json" "$OUT/route-index.json" "$OUT/quickstart.json" "$OUT/tester-handoff.json" "$OUT/tester-result-receipt.json" <<'NODE'
const fs = require("fs");
const bundle = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const quick = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const handoff = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const receipt = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(bundle.marker === "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1", "bundle marker");
ok(bundle.purpose === "public_node_single_tester_bundle", "purpose");
ok(bundle.effective_base_url === "https://example.void.test", "effective external base URL");
ok(String(bundle.start_here || "").endsWith("/public-node"), "start here");
ok(String(bundle.quickstart || "").endsWith("/public-node/quickstart.json"), "quickstart pointer");
ok(String(bundle.handoff || "").endsWith("/public-node/tester-handoff.json"), "handoff pointer");
ok(String(bundle.result_receipt || "").endsWith("/public-node/tester-result-receipt.json"), "receipt pointer");
ok(String(bundle.smoke_pack || "").endsWith("/public-node/public-exposure-smoke-pack.json"), "smoke pack pointer");
ok(String(bundle.route_index || "").endsWith("/public-node/route-index.json"), "route index pointer");
ok(String(bundle.proofs || "").endsWith("/proofs"), "proofs pointer");
ok(String(bundle.smoke_command || "").includes("/public-node/tester-bundle.json"), "bundle smoke command");

ok(bundle.policy && bundle.policy.public_routes_only === true, "public routes only");
ok(bundle.policy && bundle.policy.read_only === true, "read only");
ok(bundle.policy && bundle.policy.money_movement === false, "no money movement");
ok(bundle.policy && bundle.policy.wallet_send === false, "no wallet send");
ok(bundle.policy && bundle.policy.wc_to_void_swap === false, "no wc swap");
ok(bundle.policy && bundle.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(bundle.policy && bundle.policy.validator_mutation === false, "no validator mutation");

ok(Array.isArray(idx.routes), "route index routes");
ok(idx.routes.some(r => r.path === "/public-node/tester-bundle.json" && r.marker === "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1"), "route index bundle entry");
ok(quick.marker === "VOID_PUBLIC_NODE_QUICKSTART_V1", "quickstart still works");
ok(handoff.marker === "VOID_PUBLIC_NODE_TESTER_HANDOFF_V1", "handoff still works");
ok(receipt.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "receipt still works");

console.log("[ok] json tester bundle");
NODE

grep -Fq "VOID_PUBLIC_NODE_TESTER_BUNDLE_UI_V1" "$OUT/public-node.html"
grep -Fq "/public-node/tester-bundle.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_TESTER_BUNDLE_DOC_V1" docs/public/public-node-tester-bundle.md

echo "marker=VOID_PUBLIC_NODE_TESTER_BUNDLE_V1"
echo "route=/public-node/tester-bundle.json"
echo "ui_marker=VOID_PUBLIC_NODE_TESTER_BUNDLE_UI_V1"
echo "doc=docs/public/public-node-tester-bundle.md"
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
echo "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1_GREEN"
