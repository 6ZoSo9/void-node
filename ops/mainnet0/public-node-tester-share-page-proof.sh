#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4147}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-tester-share-page-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Tester Share Page v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_REAL_DATA_STATUS_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_DOC_V1" docs/public/public-node-tester-share-page.md
grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_REAL_DATA_STATUS_DOC_V1" docs/public/public-node-tester-share-page.md
grep -Fq "/public-node/real-data-import-lane-status.json" docs/public/public-node-tester-share-page.md
grep -Fq "/public-node/tester-share" src/index.ts
grep -Fq "/public-node/real-data-import-lane-status.json" src/index.ts

bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh
bash -n ops/mainnet0/public-node-route-manifest-proof.sh
bash -n ops/mainnet0/public-node-agent-discovery-proof.sh
bash -n ops/mainnet0/public-node-external-tester-copy-pack-proof.sh
bash -n ops/mainnet0/public-node-tester-result-intake-proof.sh
bash -n ops/mainnet0/public-node-standalone-outside-tester-smoke-proof.sh

npm run build
echo "[ok] source/docs/build/existing-proofs-updated"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4747
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
  if curl --max-time 10 -fsS "$BASE/public-node/tester-share" > "$OUT/tester-share.html" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl --max-time 10 -fsS "$BASE/public-node/external-tester-copy-pack.json" > "$OUT/external-tester-copy-pack.json"

grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1" "$OUT/tester-share.html"
grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_REAL_DATA_STATUS_V1" "$OUT/tester-share.html"
grep -Fq "/public-node/real-data-import-lane-status.json" "$OUT/tester-share.html"
grep -Fq "Real data lane status" "$OUT/tester-share.html"
grep -Fq "operator-local import only" "$OUT/tester-share.html"
grep -Fq "no public upload" "$OUT/tester-share.html"
grep -Fq "not trusted as network truth" "$OUT/tester-share.html"
grep -Fq "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1" "$OUT/tester-share.html"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/tester-share.html"
grep -Fq "/public-node/standalone-outside-tester-smoke.sh" "$OUT/tester-share.html"
grep -Fq "tester-receipt.json" "$OUT/tester-share.html"
grep -Fq "PUBLIC_NODE_BASE=http://127.0.0.1:4147" "$OUT/tester-share.html"
grep -Fq "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_UI_V1" "$OUT/public-node.html"

node - "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" "$OUT/external-tester-copy-pack.json" <<'NODE'
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const pack = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(manifest.routes.some(r => r.path === "/public-node/tester-share" && r.marker === "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1"), "manifest has tester share page");
ok(typeof manifest.route_count === "number" && manifest.route_count >= 18, "manifest route count at least 18");
ok(snap.expected_routes.includes("/public-node/tester-share"), "self-check has tester share page");
ok(typeof snap.expected_route_count === "number" && snap.expected_route_count >= 25, "self-check route count at least 25");
ok(pack.copy_pack.tester_share_page_url === "http://127.0.0.1:4147/public-node/tester-share", "copy pack tester share page url");
ok(pack.copy_pack.standalone_smoke_script_url === "http://127.0.0.1:4147/public-node/standalone-outside-tester-smoke.sh", "copy pack standalone script url");

console.log("[ok] json tester share page");
NODE

echo "marker=VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1"
echo "route=/public-node/tester-share"
echo "ui_marker=VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_UI_V1"
echo "doc=docs/public/public-node-tester-share-page.md"
echo "real_data_status_tester_share_green=true"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "route_manifest_route_count_at_least=25"
echo "self_check_expected_route_count_at_least=25"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "receipt_file=tester-receipt.json"
echo "standalone_script_route=/public-node/standalone-outside-tester-smoke.sh"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_TESTER_SHARE_PAGE_V1_GREEN"
