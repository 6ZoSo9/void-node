#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4136}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-share-link-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Share Link v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SHARE_LINK_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SHARE_LINK_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SHARE_LINK_UI_V1" src/index.ts
grep -Fq "/public-node/share-link.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SHARE_LINK_DOC_V1" docs/public/public-node-share-link.md
echo "[ok] source/docs markers"

npm run build
echo "[ok] build"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4736
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
  if curl --max-time 10 -fsS "$BASE/public-node/share-link.json" > "$OUT/share-link.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-bundle.json" > "$OUT/tester-bundle.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-result-receipt.json" > "$OUT/tester-result-receipt.json"

node - "$OUT/share-link.json" "$OUT/route-index.json" "$OUT/tester-bundle.json" "$OUT/tester-result-receipt.json" <<'NODE'
const fs = require("fs");
const share = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idx = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const bundle = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const receipt = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(share.marker === "VOID_PUBLIC_NODE_SHARE_LINK_V1", "share marker");
ok(share.purpose === "public_node_copy_paste_tester_invite", "purpose");
ok(share.effective_base_url === "https://example.void.test", "external base URL");
ok(String(share.public_node_url || "").endsWith("/public-node"), "public node url");
ok(String(share.tester_bundle_url || "").endsWith("/public-node/tester-bundle.json"), "tester bundle url");
ok(String(share.report_back || "").endsWith("/public-node/tester-result-receipt.json"), "report back url");
ok(String(share.copy_paste_invite || "").includes("Want to test a VOID public node?"), "copy paste invite");
ok(String(share.copy_paste_invite || "").includes("no wallet sends"), "invite safety copy");

ok(share.policy.public_routes_only === true, "public routes only");
ok(share.policy.read_only === true, "read only");
ok(share.policy.money_movement === false, "no money movement");
ok(share.policy.wallet_send === false, "no wallet send");
ok(share.policy.wc_to_void_swap === false, "no wc swap");
ok(share.policy.buy_void_fulfillment === false, "no buy fulfillment");
ok(share.policy.validator_mutation === false, "no validator mutation");

ok(idx.routes.some(r => r.path === "/public-node/share-link.json" && r.marker === "VOID_PUBLIC_NODE_SHARE_LINK_V1"), "route index share entry");
ok(bundle.marker === "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1", "tester bundle still works");
ok(receipt.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1", "receipt still works");

console.log("[ok] json share link");
NODE

grep -Fq "VOID_PUBLIC_NODE_SHARE_LINK_UI_V1" "$OUT/public-node.html"
grep -Fq "/public-node/share-link.json" "$OUT/public-node.html"
grep -Fq "VOID_PUBLIC_NODE_SHARE_LINK_DOC_V1" docs/public/public-node-share-link.md

echo "marker=VOID_PUBLIC_NODE_SHARE_LINK_V1"
echo "route=/public-node/share-link.json"
echo "ui_marker=VOID_PUBLIC_NODE_SHARE_LINK_UI_V1"
echo "doc=docs/public/public-node-share-link.md"
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
echo "VOID_PUBLIC_NODE_SHARE_LINK_V1_GREEN"
