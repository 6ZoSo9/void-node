#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4149}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-first-tester-request-copy-pack-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node First Tester Request Copy Pack v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_DOC_V1" docs/public/public-node-first-tester-request-copy-pack.md
grep -Fq "/public-node/first-tester-request-copy-pack.json" src/index.ts

bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh
bash -n ops/mainnet0/public-node-route-manifest-proof.sh
bash -n ops/mainnet0/public-node-agent-discovery-proof.sh
bash -n ops/mainnet0/public-node-external-tester-copy-pack-proof.sh
bash -n ops/mainnet0/public-node-tester-result-intake-proof.sh
bash -n ops/mainnet0/public-node-standalone-outside-tester-smoke-proof.sh
bash -n ops/mainnet0/public-node-tester-share-page-proof.sh
bash -n ops/mainnet0/public-node-tester-lane-summary-proof.sh

npm run build
echo "[ok] source/docs/build/existing-proofs-updated"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4749
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
  if curl --max-time 10 -fsS "$BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl --max-time 10 -fsS "$BASE/public-node/external-tester-copy-pack.json" > "$OUT/external-tester-copy-pack.json"
curl --max-time 10 -fsS "$BASE/public-node/tester-lane-summary.json" > "$OUT/tester-lane-summary.json"

node - "$OUT/first-tester-request-copy-pack.json" "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" "$OUT/external-tester-copy-pack.json" "$OUT/tester-lane-summary.json" <<'NODE'
const fs = require("fs");
const pack = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const external = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const lane = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(pack.marker === "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1", "marker");
ok(pack.purpose === "public_node_first_tester_request_copy_pack", "purpose");
ok(pack.status === "first_tester_request_copy_ready", "status");
ok(pack.effective_base_url === "http://127.0.0.1:4149", "effective base");

ok(pack.tester_links.tester_share_page === "http://127.0.0.1:4149/public-node/tester-share", "tester share link");
ok(pack.tester_links.tester_lane_summary === "http://127.0.0.1:4149/public-node/tester-lane-summary.json", "tester lane summary link");
ok(pack.tester_links.standalone_smoke_script === "http://127.0.0.1:4149/public-node/standalone-outside-tester-smoke.sh", "standalone script link");

ok(String(pack.smoke_command).includes("PUBLIC_NODE_BASE=http://127.0.0.1:4149"), "smoke command base");
ok(String(pack.smoke_command).includes("/public-node/standalone-outside-tester-smoke.sh"), "smoke command route");

ok(pack.expected_green_marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "expected green marker");
ok(pack.expected_receipt_file === "tester-receipt.json", "expected receipt file");

ok(String(pack.copy.reddit_title).includes("VOID"), "reddit title");
ok(String(pack.copy.reddit_post).includes("VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"), "reddit green marker");
ok(String(pack.copy.reddit_post).includes("http://127.0.0.1:4149/public-node/tester-share"), "reddit tester share");
ok(String(pack.copy.x_post).includes("http://127.0.0.1:4149/public-node/tester-share"), "x tester share");
ok(String(pack.copy.short_dm).includes("tester-receipt.json"), "dm receipt");
ok(String(pack.copy.github_blurb).includes("/public-node/tester-share"), "github blurb route");

ok(pack.safety_boundary.public_routes_only === true, "public routes only");
ok(pack.safety_boundary.private_api === false, "private api false");
ok(pack.safety_boundary.public_post_endpoint === false, "public post false");
ok(pack.safety_boundary.mutation === false, "mutation false");
ok(pack.safety_boundary.read_only === true, "read only");
ok(pack.safety_boundary.money_movement === false, "money false");
ok(pack.safety_boundary.wallet_send === false, "wallet false");
ok(pack.safety_boundary.wc_to_void_swap === false, "swap false");
ok(pack.safety_boundary.buy_void_fulfillment === false, "buy false");
ok(pack.safety_boundary.validator_mutation === false, "validator false");
ok(pack.safety_boundary.trusted_as_network_truth === false, "network truth false");

ok(manifest.routes.some(r => r.path === "/public-node/first-tester-request-copy-pack.json" && r.marker === "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1"), "manifest has copy pack");
ok(manifest.route_count === 25, "manifest route count 20");
ok(snap.expected_routes.includes("/public-node/first-tester-request-copy-pack.json"), "self-check has copy pack");
ok(snap.expected_route_count === 25, "self-check route count 20");
ok(external.copy_pack.first_tester_request_copy_pack_url === "http://127.0.0.1:4149/public-node/first-tester-request-copy-pack.json", "external pack has first tester copy pack url");
ok(lane.marker === "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1", "lane summary still green route");

console.log("[ok] json first tester request copy pack");
NODE

grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_UI_V1" "$OUT/public-node.html"

echo "marker=VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1"
echo "route=/public-node/first-tester-request-copy-pack.json"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_UI_V1"
echo "doc=docs/public/public-node-first-tester-request-copy-pack.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "status=first_tester_request_copy_ready"
echo "tester_share_route=/public-node/tester-share"
echo "tester_lane_summary_route=/public-node/tester-lane-summary.json"
echo "standalone_script_route=/public-node/standalone-outside-tester-smoke.sh"
echo "route_manifest_route_count=25"
echo "self_check_expected_route_count=25"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "receipt_file=tester-receipt.json"
echo "reddit_copy=true"
echo "x_copy=true"
echo "dm_copy=true"
echo "github_blurb=true"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1_GREEN"
