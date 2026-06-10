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
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_OBJECT_V1_GREEN" ops/mainnet0/public-node-local-data-drop-verify-object.sh
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_MANIFEST_V1_GREEN" ops/mainnet0/public-node-local-data-drop-verify-manifest.sh

bash -n ops/mainnet0/public-node-local-data-drop-import.sh
bash -n ops/mainnet0/public-node-local-data-drop-verify-object.sh
bash -n ops/mainnet0/public-node-local-data-drop-verify-manifest.sh
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
SAMPLE2="$OUT/sample-2.txt"
printf 'VOID public node local data drop second proof sample v1\n' > "$SAMPLE2"
EXPECTED_SHA2="$(sha256sum "$SAMPLE2" | awk '{print $1}')"

DATA_DIR="$OUT/data" ops/mainnet0/public-node-local-data-drop-import.sh "$SAMPLE2" proof-sample-2.txt > "$OUT/import-2.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1_IMPORTED" "$OUT/import-2.log"

# Refresh index after importing object 2; the earlier readiness fetch only proved the server was live.
curl --max-time 10 -fsS "$BASE/public-node/local-data-drop.json" > "$OUT/local-data-drop.json"

curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/by-sha256/$EXPECTED_SHA" > "$OUT/fetched-sample-by-sha256.txt"
curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/by-sha256/$EXPECTED_SHA2" > "$OUT/fetched-sample-2-by-sha256.txt"
curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/proof/$EXPECTED_SHA.json" > "$OUT/object-proof.json"
curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/proof/$EXPECTED_SHA2.json" > "$OUT/object-proof-2.json"
curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/manifest.json" > "$OUT/local-data-drop-manifest.json"
ops/mainnet0/public-node-local-data-drop-verify-object.sh "$BASE" "$EXPECTED_SHA" "$OUT/client-verify" > "$OUT/client-verify.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_OBJECT_V1_GREEN" "$OUT/client-verify.log"
ops/mainnet0/public-node-local-data-drop-verify-object.sh "$BASE" "$EXPECTED_SHA2" "$OUT/client-verify-2" > "$OUT/client-verify-2.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_OBJECT_V1_GREEN" "$OUT/client-verify-2.log"
ops/mainnet0/public-node-local-data-drop-verify-manifest.sh "$BASE" "$OUT/client-manifest-verify" > "$OUT/client-manifest-verify.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_MANIFEST_V1_GREEN" "$OUT/client-manifest-verify.log"
grep -Fq "object_verifier_chain_green=true" "$OUT/client-manifest-verify.log"
curl --max-time 10 -fsS "$BASE/public-node" > "$OUT/public-node.html"
curl --max-time 10 -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl --max-time 10 -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"

cmp "$OUT/sample.txt" "$OUT/fetched-sample.txt"
cmp "$OUT/sample.txt" "$OUT/fetched-sample-by-sha256.txt"
FETCHED_SHA="$(sha256sum "$OUT/fetched-sample.txt" | awk '{print $1}')"
FETCHED_BY_SHA256_SHA="$(sha256sum "$OUT/fetched-sample-by-sha256.txt" | awk '{print $1}')"
test "$FETCHED_SHA" = "$EXPECTED_SHA"
test "$FETCHED_BY_SHA256_SHA" = "$EXPECTED_SHA"

node - "$OUT/local-data-drop.json" "$OUT/route-manifest.json" "$OUT/self-check-snapshot.json" "$OUT/object-proof.json" "$OUT/object-proof-2.json" "$OUT/local-data-drop-manifest.json" "$EXPECTED_SHA" "$EXPECTED_SHA2" <<'NODE'
const fs = require("fs");
const index = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const snap = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
const proof = JSON.parse(fs.readFileSync(process.argv[5], "utf8"));
const proof2 = JSON.parse(fs.readFileSync(process.argv[6], "utf8"));
const storageManifest = JSON.parse(fs.readFileSync(process.argv[7], "utf8"));
const expectedSha = process.argv[8];
const expectedSha2 = process.argv[9];
const crypto = require("crypto");

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(index.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_INDEX_V1", "index marker");
ok(index.status === "local_data_drop_ready", "status");
ok(index.manifest_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1", "index manifest marker");
ok(index.manifest_href === "http://127.0.0.1:4150/public-node/local-data-drop/manifest.json", "index manifest href");
ok(index.object_count === 2, "object count");
const object1 = index.objects.find(o => o.object_id === "proof-sample.txt" || o.sha256 === expectedSha);
const object2 = index.objects.find(o => o.object_id === "proof-sample-2.txt" || o.sha256 === expectedSha2);
ok(object1, "object 1 present");
ok(object2, "object 2 present");
ok(object1.object_id === "proof-sample.txt", "object id");
ok(object1.sha256 === expectedSha, "sha256");
ok(object2.object_id === "proof-sample-2.txt", "object 2 id");
ok(object2.sha256 === expectedSha2, "sha256 2");
ok(index.objects.some(o => o.object_id === "proof-sample.txt" && o.sha256 === expectedSha), "object 1 id/sha");
ok(index.objects.some(o => o.object_id === "proof-sample-2.txt" && o.sha256 === expectedSha2), "object 2 id/sha");
ok(object1.href === "http://127.0.0.1:4150/public-node/local-data-drop/proof-sample.txt", "href");
ok(object1.href_by_sha256 === "http://127.0.0.1:4150/public-node/local-data-drop/by-sha256/" + expectedSha, "href by sha256");
ok(object1.proof_href === "http://127.0.0.1:4150/public-node/local-data-drop/proof/" + expectedSha + ".json", "proof href");
ok(index.public_content_address_route_template === "/public-node/local-data-drop/by-sha256/:sha256", "content address route template");
ok(index.public_proof_route_template === "/public-node/local-data-drop/proof/:sha256.json", "proof route template");
ok(index.receipt_ledger_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1", "receipt ledger marker");
ok(object1.receipt_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1", "object receipt marker");
ok(object1.receipt_sha256 === expectedSha, "object receipt sha");
ok(object1.receipt_valid_for_current_object === true, "receipt valid for current object");
ok(proof.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1", "proof marker");
ok(proof.proof_type === "operator_local_public_read_only_object_proof", "proof type");
ok(proof.object_id === "proof-sample.txt", "proof object id");
ok(proof.sha256 === expectedSha, "proof sha");
ok(proof.bytes === object1.bytes, "proof bytes");
ok(proof.content_address_href === "http://127.0.0.1:4150/public-node/local-data-drop/by-sha256/" + expectedSha, "proof content address href");
ok(proof.proof_href === "http://127.0.0.1:4150/public-node/local-data-drop/proof/" + expectedSha + ".json", "proof proof href");
ok(proof.receipt_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1", "proof receipt marker");
ok(proof.receipt_sha256 === expectedSha, "proof receipt sha");
ok(proof.receipt_valid_for_current_object === true, "proof receipt valid");
ok(proof.public_upload === false, "proof no public upload");
ok(proof.operator_local_import_only === true, "proof operator local only");
ok(proof.public_read_only === true, "proof public read only");
ok(proof.trusted_as_network_truth === false, "proof not network truth");
ok(proof2.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1", "proof 2 marker");
ok(proof2.object_id === "proof-sample-2.txt", "proof 2 object id");
ok(proof2.sha256 === expectedSha2, "proof 2 sha");
ok(proof2.receipt_sha256 === expectedSha2, "proof 2 receipt sha");
ok(proof2.receipt_valid_for_current_object === true, "proof 2 receipt valid");
ok(proof2.public_upload === false, "proof 2 no public upload");
ok(proof2.operator_local_import_only === true, "proof 2 operator local only");
ok(proof2.public_read_only === true, "proof 2 public read only");
ok(proof2.trusted_as_network_truth === false, "proof 2 not network truth");

ok(storageManifest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1", "storage manifest marker");
ok(storageManifest.manifest_root_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1", "storage manifest root marker");
ok(/^[a-f0-9]{64}$/.test(storageManifest.manifest_root_sha256), "storage manifest root sha shape");
ok(storageManifest.object_count === 2, "storage manifest object count");
ok(storageManifest.total_bytes === object1.bytes + object2.bytes, "storage manifest total bytes");
ok(storageManifest.objects.some(o => o.object_id === "proof-sample.txt" && o.sha256 === expectedSha), "storage manifest object 1 id/sha");
ok(storageManifest.objects.some(o => o.object_id === "proof-sample-2.txt" && o.sha256 === expectedSha2), "storage manifest object 2 id/sha");
const manifestObject1 = storageManifest.objects.find(o => o.object_id === "proof-sample.txt");
const manifestObject2 = storageManifest.objects.find(o => o.object_id === "proof-sample-2.txt");
ok(manifestObject1.proof_href === "http://127.0.0.1:4150/public-node/local-data-drop/proof/" + expectedSha + ".json", "storage manifest proof 1 href");
ok(manifestObject2.proof_href === "http://127.0.0.1:4150/public-node/local-data-drop/proof/" + expectedSha2 + ".json", "storage manifest proof 2 href");
ok(manifestObject1.receipt_valid_for_current_object === true, "storage manifest receipt 1 valid");
ok(manifestObject2.receipt_valid_for_current_object === true, "storage manifest receipt 2 valid");
const recomputedRoot = crypto.createHash("sha256").update(JSON.stringify(storageManifest.root_payload)).digest("hex");
ok(recomputedRoot === storageManifest.manifest_root_sha256, "storage manifest root recomputes");

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
ok(manifest.routes.some(r => r.path === "/public-node/local-data-drop/manifest.json" && r.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1"), "route manifest has storage manifest route");
ok(manifest.routes.some(r => r.path === "/public-node/local-data-drop/proof/:sha256.json" && r.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1"), "manifest has object proof route");
ok(manifest.routes.some(r => r.path === "/public-node/local-data-drop/by-sha256/:sha256" && r.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CONTENT_ADDRESS_V1"), "manifest has content address route");
ok(manifest.routes.some(r => r.path === "/public-node/local-data-drop/:objectId" && r.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_V1"), "manifest has object route");
ok(manifest.route_count === 25, "manifest route count 24");
ok(snap.expected_routes.includes("/public-node/local-data-drop.json"), "self-check has index");
ok(snap.expected_routes.includes("/public-node/local-data-drop/manifest.json"), "self-check has storage manifest route");
ok(snap.expected_routes.includes("/public-node/local-data-drop/proof/:sha256.json"), "self-check has object proof route");
ok(snap.expected_routes.includes("/public-node/local-data-drop/by-sha256/:sha256"), "self-check has content address route");
ok(snap.expected_routes.includes("/public-node/local-data-drop/:objectId"), "self-check has object route");
ok(snap.expected_route_count === 25, "self-check route count 24");

console.log("[ok] json local data drop");
NODE

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UI_V1" "$OUT/public-node.html"

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_INDEX_V1"
echo "object_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_V1"
echo "import_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1"
echo "receipt_ledger_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1"
echo "route=/public-node/local-data-drop.json"
echo "manifest_route=/public-node/local-data-drop/manifest.json"
echo "manifest_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1"
echo "manifest_root_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1"
echo "object_route=/public-node/local-data-drop/:objectId"
echo "content_address_route=/public-node/local-data-drop/by-sha256/:sha256"
echo "content_address_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CONTENT_ADDRESS_V1"
echo "object_proof_route=/public-node/local-data-drop/proof/:sha256.json"
echo "object_proof_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1"
echo "ui_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UI_V1"
echo "doc=docs/public/public-node-local-data-drop.md"
echo "import_helper=ops/mainnet0/public-node-local-data-drop-import.sh"
echo "npm_start=true"
echo "public_node_base=$BASE"
echo "object_count=2"
echo "object_id=proof-sample.txt"
echo "object_id_2=proof-sample-2.txt"
echo "object_sha256=$EXPECTED_SHA"
echo "object_sha256_2=$EXPECTED_SHA2"
echo "fetch_sha256=$FETCHED_SHA"
echo "fetch_by_sha256_sha=$FETCHED_BY_SHA256_SHA"
echo "content_address_sha256_fetch=true"
echo "public_object_proof_valid=true"
echo "client_verify_object_green=true"
echo "manifest_root_verified=true"
echo "multi_object_manifest_green=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MULTI_OBJECT_MANIFEST_V1"
echo "client_verify_manifest_green=true"
echo "object_verifier_chain_green=true"
echo "receipt_valid_for_current_object=true"
echo "route_manifest_route_count=25"
echo "self_check_expected_route_count=25"
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
