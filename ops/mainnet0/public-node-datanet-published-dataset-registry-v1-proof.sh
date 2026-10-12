#!/usr/bin/env bash
set -euo pipefail

NODE_URL="${VOID_NODE_URL:-${BASE:-http://127.0.0.1:4100}}"
ENDPOINT="${NODE_URL}/public-node/datanet/published-dataset-registry-v1.json"
OUT="${TMPDIR:-/tmp}/public-node-datanet-published-dataset-registry-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
DATASET_ID="datanet-published-registry-proof-fixture-v1"
PUBLISHED_ROOT=".void/datanet/operator-published-v1"
DATASET_DIR="$PUBLISHED_ROOT/$DATASET_ID"

cleanup() {
rm -rf "$DATASET_DIR"
}
trap cleanup EXIT

mkdir -p "$OUT/source/nested"

echo "=== VOID Public Node DataNet Published Dataset Registry v1 Proof ==="
echo "marker=VOID_DATANET_PUBLISHED_DATASET_REGISTRY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$NODE_URL"
echo "out=$OUT"

npm run build

printf 'hello from VOID published dataset registry proof\n' > "$OUT/source/README.txt"
printf '{"ok":true,"fixture":"published-dataset-registry-v1"}\n' > "$OUT/source/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh --dataset-id "$DATASET_ID" --source "$OUT/source" --out-root "$PUBLISHED_ROOT" > "$OUT/publish-output.txt"

grep -Fq "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN" "$OUT/publish-output.txt"
grep -Fq "public_safe_manifest_written=true" "$OUT/publish-output.txt"
grep -Fq "absolute_paths_in_manifest=false" "$OUT/publish-output.txt"
grep -Fq "ledger_write=false" "$OUT/publish-output.txt"
grep -Fq "wc_credit_award=false" "$OUT/publish-output.txt"

RESPONSE="$(curl -fsS "$ENDPOINT")"
printf '%s' "$RESPONSE" > "$OUT/published-dataset-registry.json"

node - "$OUT/published-dataset-registry.json" "$DATASET_ID" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const datasetId = process.argv[3];
const res = JSON.parse(fs.readFileSync(file, "utf8"));
const ds = Array.isArray(res.datasets) ? res.datasets.find((item) => item.dataset_id === datasetId) : null;

const checks = [
  ["marker", res.marker === "VOID_DATANET_PUBLISHED_DATASET_REGISTRY_V1"],
  ["ok", res.ok === true],
  ["operator_published_manifests", res.registry_scope?.operator_published_manifests === true],
  ["public_safe_metadata_only", res.registry_scope?.public_safe_metadata_only === true],
  ["fixed_operator_publish_root", res.registry_scope?.fixed_operator_publish_root === true],
  ["request_dataset_id_used_to_build_filesystem_path", res.registry_scope?.request_dataset_id_used_to_build_filesystem_path === false],
  ["route_accepts_dataset_id_parameter", res.registry_scope?.route_accepts_dataset_id_parameter === false],
  ["dataset_present", !!ds],
  ["dataset_marker", ds?.manifest_marker === "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_MANIFEST_V1"],
  ["dataset_object_count", ds?.object_count === 2],
  ["dataset_content_root_sha256", typeof ds?.content_root_sha256 === "string" && /^[a-f0-9]{64}$/.test(ds.content_root_sha256)],
  ["dataset_manifest_sha256", typeof ds?.manifest_sha256 === "string" && /^[a-f0-9]{64}$/.test(ds.manifest_sha256)],
  ["dataset_public_mutation", ds?.public_safety?.public_mutation === false],
  ["dataset_absolute_source_path_disclosed", ds?.public_safety?.absolute_source_path_disclosed === false],
  ["dataset_operator_home_path_disclosed", ds?.public_safety?.operator_home_path_disclosed === false],
  ["dataset_local_storage_root_disclosed", ds?.public_safety?.local_storage_root_disclosed === false],
  ["dataset_ledger_write", ds?.public_safety?.ledger_write === false],
  ["dataset_wc_credit_award", ds?.public_safety?.wc_credit_award === false],
  ["public_read_only", res.public_safety?.public_read_only === true],
  ["public_mutation", res.public_safety?.public_mutation === false],
  ["public_post_upload", res.public_safety?.public_post_upload === false],
  ["source_path_disclosed", res.public_safety?.source_path_disclosed === false],
  ["absolute_source_path_disclosed", res.public_safety?.absolute_source_path_disclosed === false],
  ["operator_home_path_disclosed", res.public_safety?.operator_home_path_disclosed === false],
  ["local_storage_root_disclosed", res.public_safety?.local_storage_root_disclosed === false],
  ["ledger_write", res.public_safety?.ledger_write === false],
  ["wc_credit_award", res.public_safety?.wc_credit_award === false],
];

const failed = checks.filter((pair) => pair[1] === false).map((pair) => pair[0]);
if (failed.length > 0) {
  console.error("Published dataset registry assertion failed:", failed.join(", "));
  process.exit(1);
}
NODE

node - "$OUT/published-dataset-registry.json" <<'NODELEAK'
const fs = require("node:fs");
const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");

const literalNeedles = [
  "/home/",
  "/root/",
  "/etc/",
  "/var/",
  "process.env",
  "child_process",
  "spawn(",
  "exec(",
];

const regexPatterns = [
  /BEGIN (RSA |EC |OPENSSH |PRIVATE )?KEY/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-/,
];

for (const needle of literalNeedles) {
  if (raw.includes(needle)) {
    console.error("Security Assertion Failed: private path or command hook leaked in registry response.");
    console.error(`matched_literal=${needle}`);
    process.exit(1);
  }
}

for (const pattern of regexPatterns) {
  if (pattern.test(raw)) {
    console.error("Security Assertion Failed: key material or token-like value leaked in registry response.");
    console.error(`matched_pattern=${pattern}`);
    process.exit(1);
  }
}
NODELEAK

curl -fsS "$NODE_URL/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq "/public-node/datanet/published-dataset-registry-v1.json" "$OUT/route-index.json"

grep -Fq "VOID_DATANET_PUBLISHED_DATASET_REGISTRY_DOC_V1" docs/public/public-node-datanet-published-dataset-registry-v1.md

if grep -Fq "VOID_DATANET_PUBLISHED_DATASET_REGISTRY_UI_V1" src/index.ts; then
echo "datanet_published_dataset_registry_ui_marker_present=true"
else
echo "datanet_published_dataset_registry_ui_marker_present=false"
exit 1
fi

HTTP_CODE="$(curl -o /dev/null -s -w "%{http_code}" -X POST "$ENDPOINT")"
if [ "$HTTP_CODE" -lt 400 ]; then
echo "Security Assertion Failed: POST request was not rejected."
exit 1
fi

echo "datanet_published_dataset_registry_route_green=true"
echo "datanet_published_dataset_registry_fixture_dataset_present=true"
echo "datanet_published_dataset_registry_dataset_count_at_least_one=true"
echo "datanet_published_dataset_registry_object_count=2"
echo "datanet_published_dataset_registry_public_safe_metadata_only=true"
echo "datanet_published_dataset_registry_request_dataset_id_used_to_build_filesystem_path=false"
echo "datanet_published_dataset_registry_route_accepts_dataset_id_parameter=false"
echo "datanet_published_dataset_registry_absolute_source_path_disclosed=false"
echo "datanet_published_dataset_registry_operator_home_path_disclosed=false"
echo "datanet_published_dataset_registry_local_storage_root_disclosed=false"
echo "datanet_published_dataset_registry_public_mutation=false"
echo "datanet_published_dataset_registry_ledger_write=false"
echo "datanet_published_dataset_registry_wc_credit_award=false"
echo "VOID_DATANET_PUBLISHED_DATASET_REGISTRY_PROOF_V1_GREEN"
