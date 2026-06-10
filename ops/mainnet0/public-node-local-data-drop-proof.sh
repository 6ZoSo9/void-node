#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4150}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Local Data Drop v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_INDEX_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DOC_V1" docs/public/public-node-local-data-drop.md
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1_IMPORTED" ops/mainnet0/public-node-local-data-drop-import.sh

bash -n ops/mainnet0/public-node-local-data-drop-import.sh
bash -n ops/mainnet0/public-node-route-manifest-proof.sh
bash -n ops/mainnet0/public-node-self-check-snapshot-proof.sh

cat > "$OUT/sample.txt" <<'TXT'
VOID local data drop proof object.
This is operator-local storage served through a public read-only VOID node route.
TXT

DATA_DIR="$OUT/data" ops/mainnet0/public-node-local-data-drop-import.sh "$OUT/sample.txt" proof-sample.txt > "$OUT/import.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1_IMPORTED" "$OUT/import.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1" "$OUT/import.log"
grep -Fq "public_upload=false" "$OUT/import.log"
grep -Fq "operator_local_import_only=true" "$OUT/import.log"
test -f "$OUT/data/public-node/local-data-drop/receipts/proof-sample.txt.json"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1" "$OUT/data/public-node/local-data-drop/receipts/proof-sample.txt.json"

EXPECTED_SHA="$(sha256sum "$OUT/sample.txt" | awk '{print $1}')"

npm run build
echo "[ok] source/docs/build/import-helper"

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
  if curl --max-time 10 -fsS "$BASE/public-node/local-data-drop.json" > "$OUT/local-data-drop.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/proof-sample.txt" > "$OUT/fetched-sample.txt"
curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"

cmp "$OUT/sample.txt" "$OUT/fetched-sample.txt"
FETCHED_SHA="$(sha256sum "$OUT/fetched-sample.txt" | awk '{print $1}')"
test "$FETCHED_SHA" = "$EXPECTED_SHA"

node - "$OUT/local-data-drop.json" "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" "$EXPECTED_SHA" <<'NODE'
const fs = require("fs");
const index = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const expectedSha = process.argv[5];

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(index.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_INDEX_V1", "index marker");
ok(index.status === "local_data_drop_ready", "status");
ok(index.object_count === 1, "object count");
ok(index.objects[0].object_id === "proof-sample.txt", "object id");
ok(index.objects[0].sha256 === expectedSha, "sha256");
ok(index.objects[0].href === "http://127.0.0.1:4150/public-node/local-data-drop/proof-sample.txt", "href");
ok(index.receipt_ledger_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1", "receipt ledger marker");
ok(index.objects[0].receipt_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1", "object receipt marker");
ok(index.objects[0].receipt_sha256 === expectedSha, "object receipt sha");
ok(index.objects[0].receipt_valid_for_current_object === true, "receipt valid for current object");
ok(index.policy.public_upload === false, "no public upload");
ok(index.policy.operator_local_import_only === true, "operator local only");
ok(index.policy.public_read_only === true, "public read only");
ok(index.policy.money_movement === false, "no money");
ok(index.policy.wallet_send === false, "no wallet");
ok(index.policy.wc_to_void_swap === false, "no wc swap");
ok(index.policy.buy_void_fulfillment === false, "no buy");
ok(index.policy.validator_mutation === false, "no validator");
ok(index.policy.trusted_as_network_truth === false, "not network truth");

ok(manifest.routes.some(r => r.path === "/public-node/local-data-drop.json" && r.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_INDEX_V1"), "manifest has index");
ok(manifest.routes.some(r => r.path === "/public-node/local-data-drop/:objectId" && r.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_V1"), "manifest has object route");
ok(manifest.route_count === 22, "manifest route count 22");
ok(snap.expected_routes.includes("/public-node/local-data-drop.json"), "self-check has index");
ok(snap.expected_routes.includes("/public-node/local-data-drop/:objectId"), "self-check has object route");
ok(snap.expected_route_count === 22, "self-check route count 22");

console.log("[ok] json local data drop");
NODE

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UI_V1" "$OUT/public-node.html"

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_INDEX_V1"
echo "object_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_V1"
echo "import_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1"
echo "receipt_ledger_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1"
echo "route=/public-node/local-data-drop.json"
echo "object_route=/public-node/local-data-drop/:objectId"
echo "ui_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UI_V1"
echo "doc=docs/public/public-node-local-data-drop.md"
echo "import_helper=ops/mainnet0/public-node-local-data-drop-import.sh"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "object_count=1"
echo "object_id=proof-sample.txt"
echo "object_sha256=$EXPECTED_SHA"
echo "fetch_sha256=$FETCHED_SHA"
echo "receipt_valid_for_current_object=true"
echo "route_manifest_route_count=22"
echo "self_check_expected_route_count=22"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_V1_GREEN"
