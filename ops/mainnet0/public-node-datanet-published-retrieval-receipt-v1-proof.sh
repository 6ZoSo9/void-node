#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-${NODE_URL:-http://127.0.0.1:4100}}"
OUT="${TMPDIR:-/tmp}/public-node-datanet-published-retrieval-receipt-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
DATASET_ID="datanet-published-retrieval-receipt-proof-fixture-v1"
SRC="$OUT/source"

mkdir -p "$SRC/nested"

echo "=== VOID Public Node DataNet Published Retrieval Receipt v1 Proof ==="
echo "marker=VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID published retrieval receipt fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_FIXTURE_V1","ok":true}\n' > "$SRC/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" \
  > "$OUT/publish.log"

grep -Fq "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN" "$OUT/publish.log"
grep -Fq "public_safe_manifest_written=true" "$OUT/publish.log"
grep -Fq "absolute_paths_in_manifest=false" "$OUT/publish.log"
grep -Fq "operator_home_path_in_manifest=false" "$OUT/publish.log"
grep -Fq "local_storage_root_in_manifest=false" "$OUT/publish.log"
grep -Fq "public_mutation=false" "$OUT/publish.log"
grep -Fq "ledger_write=false" "$OUT/publish.log"
grep -Fq "wc_credit_award=false" "$OUT/publish.log"

curl -fsS "$BASE/public-node/datanet/published-dataset-registry-v1.json" > "$OUT/registry.json"
curl -fsS "$BASE/public-node/datanet/published/${DATASET_ID}/manifest-v1.json" > "$OUT/manifest-route.json"
curl -fsS "$BASE/public-node/datanet/published-retrieval-receipt-v1.json" > "$OUT/receipt.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

node - "$OUT/registry.json" "$OUT/manifest-route.json" "$OUT/receipt.json" <<'NODE'
const fs = require("node:fs");
const [registryFile, manifestFile, receiptFile] = process.argv.slice(2);
const registry = JSON.parse(fs.readFileSync(registryFile, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));

const datasetId = "datanet-published-retrieval-receipt-proof-fixture-v1";
const registryDataset = Array.isArray(registry.datasets)
  ? registry.datasets.find((d) => d.dataset_id === datasetId)
  : null;

const checks = [
  ["registry_marker", registry.marker === "VOID_DATANET_PUBLISHED_DATASET_REGISTRY_V1"],
  ["registry_has_dataset", !!registryDataset],
  ["registry_public_safe_metadata_only", registry.registry_scope?.public_safe_metadata_only === true],
  ["registry_request_dataset_id_used_to_build_filesystem_path", registry.registry_scope?.request_dataset_id_used_to_build_filesystem_path === false],
  ["manifest_route_marker", manifest.marker === "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1"],
  ["manifest_dataset_id", manifest.dataset_id === datasetId],
  ["manifest_selected_from_registry", manifest.selected_from_registry === true],
  ["manifest_object_count", manifest.object_count >= 1],
  ["manifest_public_safe_manifest", manifest.safety?.public_safe_manifest === true],
  ["manifest_raw_request_dataset_id_used_to_build_filesystem_path", manifest.safety?.raw_request_dataset_id_used_to_build_filesystem_path === false],
  ["receipt_marker", receipt.marker === "VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_V1"],
  ["receipt_ok", receipt.ok === true],
  ["receipt_dataset_id", receipt.dataset_id === datasetId],
  ["receipt_registry_dataset_found", receipt.registry_discovery?.dataset_found === true],
  ["receipt_public_safe_manifest_returned", receipt.manifest_read?.public_safe_manifest_returned === true],
  ["receipt_object_selected_from_manifest", receipt.object_retrieval?.object_selected_from_manifest === true],
  ["receipt_object_sha256_verified", receipt.object_retrieval?.object_sha256_verified === true],
  ["receipt_bytes_match_manifest", receipt.object_retrieval?.bytes_match_manifest === true],
  ["receipt_bytes_match_source", receipt.object_retrieval?.bytes_match_source === true],
  ["receipt_public_safe", receipt.retrieval_receipt?.receipt_public_safe === true],
  ["receipt_discloses_absolute_path", receipt.retrieval_receipt?.receipt_discloses_absolute_path === false],
  ["receipt_discloses_operator_home_path", receipt.retrieval_receipt?.receipt_discloses_operator_home_path === false],
  ["receipt_discloses_storage_root", receipt.retrieval_receipt?.receipt_discloses_storage_root === false],
  ["public_mutation", receipt.public_safety?.public_mutation === false],
  ["ledger_write", receipt.public_safety?.ledger_write === false],
  ["wc_credit_award", receipt.public_safety?.wc_credit_award === false],
];

let failed = false;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`${name}=false`);
    failed = true;
  }
}
if (failed) process.exit(1);

console.log("datanet_published_retrieval_receipt_registry_has_dataset=true");
console.log("datanet_published_retrieval_receipt_manifest_read_route_green=true");
console.log("datanet_published_retrieval_receipt_object_selected_from_manifest=true");
console.log("datanet_published_retrieval_receipt_object_sha256_verified=true");
console.log("datanet_published_retrieval_receipt_bytes_match_manifest=true");
console.log("datanet_published_retrieval_receipt_bytes_match_source=true");
console.log("datanet_published_retrieval_receipt_created=true");
console.log("datanet_published_retrieval_receipt_public_safe=true");
console.log("datanet_published_retrieval_receipt_discloses_absolute_path=false");
console.log("datanet_published_retrieval_receipt_discloses_operator_home_path=false");
console.log("datanet_published_retrieval_receipt_discloses_storage_root=false");
console.log("datanet_published_retrieval_receipt_public_mutation=false");
console.log("datanet_published_retrieval_receipt_ledger_write=false");
console.log("datanet_published_retrieval_receipt_wc_credit_award=false");
NODE

grep -Fq "/public-node/datanet/published-retrieval-receipt-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_DOC_V1" docs/public/public-node-datanet-published-retrieval-receipt-v1.md

if grep -E '/home/|/Users/|C:\\|\.ssh|PRIVATE KEY|BEGIN RSA|BEGIN OPENSSH|token=|secret=' "$OUT/receipt.json" >/dev/null; then
  echo "datanet_published_retrieval_receipt_private_leak_scan_green=false"
  exit 1
fi

echo "datanet_published_retrieval_receipt_private_leak_scan_green=true"
echo "VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_PROOF_V1_GREEN"
