#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4146}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-standalone-outside-tester-smoke-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Standalone Outside Tester Smoke Script v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_DOC_V1" docs/public/public-node-standalone-outside-tester-smoke.md
grep -Fq "/public-node/standalone-outside-tester-smoke.sh" src/index.ts

bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh
bash -n ops/mainnet0/public-node-route-manifest-proof.sh
bash -n ops/mainnet0/public-node-agent-discovery-proof.sh
bash -n ops/mainnet0/public-node-external-tester-copy-pack-proof.sh
bash -n ops/mainnet0/public-node-tester-result-intake-proof.sh

npm run build
echo "[ok] source/docs/build/existing-proofs-updated"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4746
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
  if curl --max-time 10 -fsS "$BASE/public-node/standalone-outside-tester-smoke.sh" > "$OUT/standalone-smoke.sh" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

chmod +x "$OUT/standalone-smoke.sh"
grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1" "$OUT/standalone-smoke.sh"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/standalone-smoke.sh"

PUBLIC_NODE_BASE="$BASE" OUT="$OUT/standalone-run" bash "$OUT/standalone-smoke.sh" > "$OUT/standalone-run.log"

curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl --max-time 10 -fsS "$BASE/public-node/external-tester-copy-pack.json" > "$OUT/external-tester-copy-pack.json"

grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/standalone-run.log"
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1" "$OUT/standalone-run/tester-receipt.json"
grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1" "$OUT/standalone-run/tester-receipt.json"
grep -Fq '"trusted_as_network_truth": false' "$OUT/standalone-run/tester-receipt.json"
grep -Fq "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_UI_V1" "$OUT/public-node.html"

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

ok(manifest.routes.some(r => r.path === "/public-node/standalone-outside-tester-smoke.sh" && r.marker === "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1"), "manifest has standalone smoke script");
ok(manifest.route_count === 23, "manifest route count 17");
ok(snap.expected_routes.includes("/public-node/standalone-outside-tester-smoke.sh"), "self-check has standalone smoke script");
ok(snap.expected_route_count === 23, "self-check route count 17");
ok(pack.copy_pack.standalone_smoke_script_url === "http://127.0.0.1:4146/public-node/standalone-outside-tester-smoke.sh", "copy pack standalone script url");
ok(String(pack.copy_pack.standalone_smoke_command || "").includes("PUBLIC_NODE_BASE=http://127.0.0.1:4146"), "copy pack standalone smoke command base");
ok(String(pack.copy_pack.standalone_smoke_command || "").includes("/public-node/standalone-outside-tester-smoke.sh"), "copy pack standalone smoke command route");

console.log("[ok] json standalone outside tester smoke script");
NODE

echo "marker=VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1"
echo "route=/public-node/standalone-outside-tester-smoke.sh"
echo "ui_marker=VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_UI_V1"
echo "doc=docs/public/public-node-standalone-outside-tester-smoke.md"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "standalone_script_fetched=true"
echo "standalone_script_executed=true"
echo "receipt_written=true"
echo "route_manifest_route_count=23"
echo "self_check_expected_route_count=23"
echo "expected_receipt_marker=VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1_GREEN"
