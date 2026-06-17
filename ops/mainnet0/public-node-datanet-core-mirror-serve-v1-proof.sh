#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-mirror-loop-fixture-v1"
MIRROR_NODE_LABEL="serve-proof-node"
OUT="${TMPDIR:-/tmp}/public-node-datanet-core-mirror-serve-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-serve-proof-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID Public Node DataNet Core Mirror Serve v1 Proof ==="
echo "marker=VOID_DATANET_CORE_MIRROR_SERVE_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Mirror Loop fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_MIRROR_LOOP_FIXTURE_V1","ok":true,"purpose":"publish-fetch-mirror-verify"}\n' > "$SRC/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" > "$OUT/publish.log"

grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN' "$OUT/publish.log"

BASE="$BASE" \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  ops/mainnet0/datanet-core-mirror-loop-v1.sh > "$OUT/mirror-loop.log"

grep -Fq 'VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN' "$OUT/mirror-loop.log"

curl -fsS "$BASE/public-node/datanet/core-mirror/registry-v1.json" > "$OUT/registry.json"
curl -fsS "$BASE/public-node/datanet/core-mirror/${MIRROR_NODE_LABEL}/${DATASET_ID}/receipt-v1.json" > "$OUT/receipt-route.json"

node - "$OUT/registry.json" "$OUT/receipt-route.json" "$OUT/object.env" <<'NODE'
const fs = require("node:fs");

const registry = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const receiptRoute = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const objectEnv = process.argv[4];

const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (registry.marker !== "VOID_DATANET_CORE_MIRROR_SERVE_REGISTRY_V1") fail("registry_marker_valid=false");
if (registry.ok !== true) fail("registry_ok=false");
if (!Array.isArray(registry.mirrors)) fail("registry_mirrors_array=false");

const reg = registry.mirrors.find((m) => m.mirror_node_label === "serve-proof-node" && m.dataset_id === "datanet-core-mirror-loop-fixture-v1");
if (!reg) fail("registry_has_mirror=false");
if (reg.selected_from_fixed_mirror_root !== true) fail("registry_selected_from_fixed_mirror_root=false");
if (reg.all_objects_fetched !== true) fail("registry_all_objects_fetched=false");
if (reg.all_object_sha256_verified !== true) fail("registry_all_object_sha256_verified=false");
if (reg.all_object_bytes_match_manifest !== true) fail("registry_all_object_bytes_match_manifest=false");

const regSafety = registry.public_safety || {};
if (regSafety.public_mutation !== false) fail("registry_public_mutation_not_false");
if (regSafety.ledger_write !== false) fail("registry_ledger_write_not_false");
if (regSafety.wc_credit_award !== false) fail("registry_wc_credit_award_not_false");

if (receiptRoute.marker !== "VOID_DATANET_CORE_MIRROR_SERVE_RECEIPT_V1") fail("receipt_route_marker_valid=false");
if (receiptRoute.ok !== true) fail("receipt_route_ok=false");
if (receiptRoute.selected_from_mirror_registry !== true) fail("receipt_selected_from_mirror_registry=false");

const receipt = receiptRoute.receipt || {};
if (receipt.marker !== "VOID_DATANET_CORE_MIRROR_LOOP_RECEIPT_V1") fail("loop_receipt_marker_valid=false");
if (receipt.dataset_id !== "datanet-core-mirror-loop-fixture-v1") fail("receipt_dataset_match=false");
if (receipt.mirror_node_label !== "serve-proof-node") fail("receipt_node_label_match=false");

const mirror = receipt.object_mirror || {};
if (mirror.object_count !== 2) fail("receipt_object_count_match=false");
if (mirror.total_bytes !== 145) fail("receipt_total_bytes_match=false");
if (mirror.all_objects_fetched !== true) fail("receipt_all_objects_fetched=false");
if (mirror.all_object_sha256_verified !== true) fail("receipt_all_object_sha256_verified=false");
if (mirror.all_object_bytes_match_manifest !== true) fail("receipt_all_object_bytes_match_manifest=false");
if (!Array.isArray(mirror.objects) || mirror.objects.length < 1) fail("receipt_objects_present=false");

const safety = receiptRoute.mirror_serve_safety || {};
if (safety.receipt_public_safe !== true) fail("receipt_public_safe=false");
if (safety.raw_request_dataset_id_used_to_build_filesystem_path !== false) fail("raw_request_dataset_id_used_to_build_filesystem_path_not_false");
if (safety.raw_request_mirror_node_label_used_to_build_filesystem_path !== false) fail("raw_request_mirror_node_label_used_to_build_filesystem_path_not_false");
if (safety.local_mirror_path_disclosed !== false) fail("local_mirror_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("local_storage_root_disclosed_not_false");
if (safety.public_mutation !== false) fail("receipt_public_mutation_not_false");
if (safety.ledger_write !== false) fail("receipt_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("receipt_wc_credit_award_not_false");

const first = mirror.objects[0];
if (!isSha(first.sha256)) fail("first_object_sha_valid=false");

fs.writeFileSync(objectEnv, [
  "OBJECT_SHA=" + first.sha256,
  "OBJECT_BYTES=" + first.bytes
].join("\n") + "\n");

console.log("registry_marker_valid=true");
console.log("registry_has_mirror=true");
console.log("registry_all_objects_fetched=true");
console.log("registry_all_object_sha256_verified=true");
console.log("registry_all_object_bytes_match_manifest=true");
console.log("receipt_route_marker_valid=true");
console.log("receipt_selected_from_mirror_registry=true");
console.log("receipt_public_safe=true");
console.log("receipt_object_count_match=true");
console.log("receipt_total_bytes_match=true");
console.log("receipt_public_mutation=false");
console.log("receipt_ledger_write=false");
console.log("receipt_wc_credit_award=false");
NODE

cat "$OUT/object.env"
. "$OUT/object.env"

curl -fsS -D "$OUT/object.headers" \
  "$BASE/public-node/datanet/core-mirror/${MIRROR_NODE_LABEL}/${DATASET_ID}/object/${OBJECT_SHA}" \
  -o "$OUT/object.blob"

ACTUAL_SHA="$(sha256sum "$OUT/object.blob" | awk '{print $1}')"
ACTUAL_BYTES="$(wc -c < "$OUT/object.blob" | tr -d ' ')"

if [ "$ACTUAL_SHA" != "$OBJECT_SHA" ]; then
  echo "served_object_sha256_verified=false"
  exit 1
fi

if [ "$ACTUAL_BYTES" != "$OBJECT_BYTES" ]; then
  echo "served_object_bytes_match_receipt=false"
  exit 1
fi

grep -Fiq 'X-VOID-Marker: VOID_DATANET_CORE_MIRROR_OBJECT_FETCH_V1' "$OUT/object.headers"
grep -Fiq 'X-VOID-Object-Sha256-Verified: true' "$OUT/object.headers"
grep -Fiq 'X-VOID-Object-Selected-From-Mirror-Receipt: true' "$OUT/object.headers"
grep -Fiq 'X-VOID-Public-Mutation: false' "$OUT/object.headers"
grep -Fiq 'X-VOID-Ledger-Write: false' "$OUT/object.headers"
grep -Fiq 'X-VOID-WC-Credit-Award: false' "$OUT/object.headers"

curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq '/public-node/datanet/core-mirror/registry-v1.json' "$OUT/route-index.json"
grep -Fq '/public-node/datanet/core-mirror/:mirror_node_label/:dataset_id/receipt-v1.json' "$OUT/route-index.json"
grep -Fq '/public-node/datanet/core-mirror/:mirror_node_label/:dataset_id/object/:sha256' "$OUT/route-index.json"

grep -Fq 'VOID_DATANET_CORE_MIRROR_SERVE_DOC_V1' docs/public/public-node-datanet-core-mirror-serve-v1.md

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet/core-mirror|zoso' "$OUT/registry.json" "$OUT/receipt-route.json"; then
  echo "mirror_serve_private_leak_scan_green=false"
  exit 1
fi

echo "served_object_sha256_verified=true"
echo "served_object_bytes_match_receipt=true"
echo "mirror_object_fetch_header_marker_present=true"
echo "mirror_serve_private_leak_scan_green=true"
echo "mirror_serve_public_mutation=false"
echo "mirror_serve_ledger_write=false"
echo "mirror_serve_wc_credit_award=false"
echo "VOID_DATANET_CORE_MIRROR_SERVE_PROOF_V1_GREEN"
