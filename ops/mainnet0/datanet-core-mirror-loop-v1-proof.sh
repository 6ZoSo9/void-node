#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-mirror-loop-fixture-v1"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-proof-source"
OUT="${TMPDIR:-/tmp}/void-datanet-core-mirror-loop-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
MIRROR_ROOT="${OUT}/mirror-root"

rm -rf "$SRC" "$OUT"
mkdir -p "$SRC/nested" "$OUT"

echo "=== VOID DataNet Core Mirror Loop v1 Proof ==="
echo "marker=VOID_DATANET_CORE_MIRROR_LOOP_PROOF_V1"
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
grep -Fq 'public_mutation=false' "$OUT/publish.log"
grep -Fq 'ledger_write=false' "$OUT/publish.log"
grep -Fq 'wc_credit_award=false' "$OUT/publish.log"

curl -fsS "$BASE/public-node/datanet/published/${DATASET_ID}/manifest-v1.json" > "$OUT/manifest-route.json"

node - "$OUT/manifest-route.json" > "$OUT/manifest-check.env" <<'NODE'
const fs = require("node:fs");
const res = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (res.marker !== "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1") fail("manifest_route_marker_valid=false");
if (res.ok !== true) fail("manifest_route_ok=false");
if (res.dataset_id !== "datanet-core-mirror-loop-fixture-v1") fail("dataset_id_match=false");
if (res.selected_from_registry !== true) fail("selected_from_registry=false");
if (!isSha(res.manifest_sha256)) fail("manifest_sha256_valid=false");
if (!isSha(res.content_root_sha256)) fail("content_root_sha256_valid=false");
if (!Array.isArray(res.objects) || res.objects.length !== 2) fail("object_count_match=false");

const safety = res.safety || {};
if (safety.public_safe_manifest !== true) fail("public_safe_manifest=false");
if (safety.dataset_selected_through_registry !== true) fail("dataset_selected_through_registry=false");
if (safety.raw_request_dataset_id_used_to_build_filesystem_path !== false) fail("raw_request_dataset_id_used_to_build_filesystem_path_not_false");
if (safety.absolute_source_path_disclosed !== false) fail("absolute_source_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("local_storage_root_disclosed_not_false");
if (safety.public_mutation !== false) fail("public_mutation_not_false");
if (safety.ledger_write !== false) fail("ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("wc_credit_award_not_false");

console.log("manifest_route_green=true");
console.log("manifest_sha256=" + res.manifest_sha256);
console.log("content_root_sha256=" + res.content_root_sha256);
console.log("object_count=" + res.objects.length);
NODE

cat "$OUT/manifest-check.env"

VOID_DATANET_CORE_MIRROR_ROOT="$MIRROR_ROOT" \
BASE="$BASE" \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="proof-node" \
  ops/mainnet0/datanet-core-mirror-loop-v1.sh > "$OUT/mirror.log"

cat "$OUT/mirror.log"

grep -Fq 'VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN' "$OUT/mirror.log"
grep -Fq 'mirror_receipt_created=true' "$OUT/mirror.log"
grep -Fq 'mirror_receipt_public_safe=true' "$OUT/mirror.log"
grep -Fq 'mirror_receipt_private_path_leak_scan_green=true' "$OUT/mirror.log"
grep -Fq 'public_mutation=false' "$OUT/mirror.log"
grep -Fq 'ledger_write=false' "$OUT/mirror.log"
grep -Fq 'wc_credit_award=false' "$OUT/mirror.log"

RECEIPT="$MIRROR_ROOT/proof-node/${DATASET_ID}/receipts/core-mirror-loop-receipt.json"
test -f "$RECEIPT"

node - "$RECEIPT" > "$OUT/receipt-check.env" <<'NODE'
const fs = require("node:fs");
const receipt = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (receipt.marker !== "VOID_DATANET_CORE_MIRROR_LOOP_RECEIPT_V1") fail("receipt_marker_valid=false");
if (receipt.ok !== true) fail("receipt_ok=false");
if (receipt.dataset_id !== "datanet-core-mirror-loop-fixture-v1") fail("receipt_dataset_match=false");
if (receipt.mirror_node_label !== "proof-node") fail("receipt_node_label_match=false");

const manifest = receipt.manifest_read || {};
if (manifest.route_marker !== "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1") fail("receipt_manifest_route_marker_valid=false");
if (manifest.selected_from_registry !== true) fail("receipt_selected_from_registry=false");
if (!isSha(manifest.manifest_sha256)) fail("receipt_manifest_sha256_valid=false");
if (!isSha(manifest.content_root_sha256)) fail("receipt_content_root_sha256_valid=false");
if (manifest.public_safe_manifest !== true) fail("receipt_public_safe_manifest=false");

const mirror = receipt.object_mirror || {};
if (mirror.object_count !== 2) fail("receipt_object_count_match=false");
if (mirror.total_bytes !== 145) fail("receipt_total_bytes_match=false");
if (mirror.all_objects_fetched !== true) fail("receipt_all_objects_fetched=false");
if (mirror.all_object_sha256_verified !== true) fail("receipt_all_object_sha256_verified=false");
if (mirror.all_object_bytes_match_manifest !== true) fail("receipt_all_object_bytes_match_manifest=false");

const safety = receipt.public_safety || {};
if (safety.mirror_receipt_public_safe !== true) fail("receipt_public_safe=false");
if (safety.local_mirror_path_disclosed !== false) fail("receipt_local_mirror_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("receipt_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("receipt_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("receipt_local_storage_root_disclosed_not_false");
if (safety.public_mutation !== false) fail("receipt_public_mutation_not_false");
if (safety.ledger_write !== false) fail("receipt_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("receipt_wc_credit_award_not_false");

if (!isSha(receipt.retrieval_receipt?.receipt_sha256)) fail("receipt_sha256_valid=false");

console.log("receipt_marker_valid=true");
console.log("receipt_dataset_match=true");
console.log("receipt_node_label_match=true");
console.log("receipt_object_count_match=true");
console.log("receipt_total_bytes_match=true");
console.log("receipt_all_objects_fetched=true");
console.log("receipt_all_object_sha256_verified=true");
console.log("receipt_all_object_bytes_match_manifest=true");
console.log("receipt_public_safe=true");
console.log("receipt_public_mutation=false");
console.log("receipt_ledger_write=false");
console.log("receipt_wc_credit_award=false");
NODE

cat "$OUT/receipt-check.env"

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet/core-mirror-v1|zoso' "$RECEIPT"; then
  echo "receipt_private_leak_scan_green=false"
  exit 1
fi

echo "receipt_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_MIRROR_LOOP_PROOF_V1_GREEN"
