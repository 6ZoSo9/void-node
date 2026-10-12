#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4137}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-tester-loop-status-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Tester Loop Status v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_UI_V1" src/index.ts
grep -Fq "/public-node/tester-loop-status.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_DOC_V1" docs/public/public-node-tester-loop-status.md
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_README_POINTER_V1" README.md
echo "[ok] source/docs/readme markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4737
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
  if curl --max-time 10 -fsS "$BASE/public-node/tester-loop-status.json" > "$OUT/tester-loop-status.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/share-link.json" > "$OUT/share-link.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-bundle.json" > "$OUT/tester-bundle.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-result-receipt.json" > "$OUT/tester-result-receipt.json"

node - "$OUT/tester-loop-status.json" "$OUT/route-index.json" "$OUT/share-link.json" "$OUT/tester-bundle.json" "$OUT/tester-result-receipt.json" <<'NODE'
const fs = require("fs");
const status = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const share = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const bundle = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const receipt = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(status.marker === "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1", "status marker");
ok(status.purpose === "public_node_outside_tester_loop_status", "purpose");
ok(status.effective_base_url === "https://example.void.test", "external base URL");
ok(status.loop_ready === true, "loop ready");
ok(Array.isArray(status.discovery_chain), "discovery chain array");
ok(status.discovery_chain.includes("README.md"), "readme in chain");
ok(status.discovery_chain.includes("/public-node/share-link.json"), "share link in chain");
ok(status.discovery_chain.includes("/public-node/tester-bundle.json"), "bundle in chain");
ok(status.discovery_chain.includes("/public-node/tester-result-receipt.json"), "receipt in chain");

ok(status.status.readme_pointer === true, "readme pointer status");
ok(status.status.share_link === true, "share link status");
ok(status.status.public_node_page === true, "public node status");
ok(status.status.tester_bundle === true, "tester bundle status");
ok(status.status.result_receipt === true, "result receipt status");
ok(status.status.route_index === true, "route index status");
ok(status.status.proofs === true, "proofs status");

ok(status.policy.public_routes_only === true, "public routes only");
ok(status.policy.read_only === true, "read only");
ok(status.policy.money_movement === false, "no money movement");
ok(status.policy.wallet_send === false, "no wallet send");
ok(status.policy.wc_to_void_swap === false, "no wc swap");
ok(status.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(status.policy.validator_mutation === false, "no validator mutation");

ok(idx.routes.some(r => r.path === "/public-node/tester-loop-status.json" && r.marker === "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1"), "route index loop status entry");
ok(share.marker === "VOID_PUBLIC_NODE_SHARE_LINK_V1", "share link still works");
ok(bundle.marker === "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1", "tester bundle still works");
ok(receipt.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "receipt still works");

console.log("[ok] json tester loop status");
NODE

grep -Fq "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_UI_V1" "$OUT/public-node.html"
grep -Fq "/public-node/tester-loop-status.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_DOC_V1" docs/public/public-node-tester-loop-status.md

echo "marker=VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1"
echo "route=/public-node/tester-loop-status.json"
echo "ui_marker=VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_UI_V1"
echo "doc=docs/public/public-node-tester-loop-status.md"
echo "npm_start=true"
echo "external_base_url=https://example.void.test"
echo "loop_ready=true"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_TESTER_LOOP_STATUS_V1_GREEN"
