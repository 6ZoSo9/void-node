#!/usr/bin/env bash
set -euo pipefail

NODE_URL="${VOID_NODE_URL:-${BASE:-http://127.0.0.1:4100}}"
DATASET_ID="datanet-published-read-route-proof-fixture-v1"
ENDPOINT="${NODE_URL}/public-node/datanet/published/${DATASET_ID}/manifest-v1.json"
BAD_ENDPOINT="${NODE_URL}/public-node/datanet/published/%2e%2e%2fetc/manifest-v1.json"
MISSING_ENDPOINT="${NODE_URL}/public-node/datanet/published/datanet-missing-read-route-fixture-v1/manifest-v1.json"
OUT="${TMPDIR:-/tmp}/public-node-datanet-published-dataset-read-route-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
PUBLISHED_ROOT=".void/datanet/operator-published-v1"
DATASET_DIR="$PUBLISHED_ROOT/$DATASET_ID"

cleanup() {
rm -rf "$DATASET_DIR"
}
trap cleanup EXIT

mkdir -p "$OUT/source/nested"

echo "=== VOID Public Node DataNet Published Dataset Read Route v1 Proof ==="
echo "marker=VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$NODE_URL"
echo "out=$OUT"

npm run build

printf 'hello from VOID published dataset read route proof\n' > "$OUT/source/README.txt"
printf '{"ok":true,"fixture":"published-dataset-read-route-v1"}\n' > "$OUT/source/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh --dataset-id "$DATASET_ID" --source "$OUT/source" --out-root "$PUBLISHED_ROOT" > "$OUT/publish-output.txt"

grep -Fq "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN" "$OUT/publish-output.txt"
grep -Fq "public_safe_manifest_written=true" "$OUT/publish-output.txt"
grep -Fq "absolute_paths_in_manifest=false" "$OUT/publish-output.txt"
grep -Fq "ledger_write=false" "$OUT/publish-output.txt"
grep -Fq "wc_credit_award=false" "$OUT/publish-output.txt"

curl -fsS "$ENDPOINT" > "$OUT/read-response.json"

node - "$OUT/read-response.json" "$DATASET_ID" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const datasetId = process.argv[3];
const res = JSON.parse(fs.readFileSync(file, "utf8"));

const checks = [
["marker", res.marker === "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1"],
["ok", res.ok === true],
["dataset_id", res.dataset_id === datasetId],
["selected_from_registry", res.selected_from_registry === true],
["manifest_marker", res.manifest_marker === "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_MANIFEST_V1"],
["manifest_sha256", typeof res.manifest_sha256 === "string" && /^[a-f0-9]{64}$/.test(res.manifest_sha256)],
["object_count", res.object_count === 2],
["objects", Array.isArray(res.objects) && res.objects.length === 2],
["content_root_sha256", typeof res.content_root_sha256 === "string" && /^[a-f0-9]{64}$/.test(res.content_root_sha256)],
["object_paths_relative", Array.isArray(res.objects) && res.objects.every((item) => typeof item.path === "string" && !item.path.startsWith("/") && !item.path.includes(".."))],
["object_hashes", Array.isArray(res.objects) && res.objects.every((item) => typeof item.sha256 === "string" && /^[a-f0-9]{64}$/.test(item.sha256))],
["public_safe_manifest", res.safety?.public_safe_manifest === true],
["dataset_selected_through_registry", res.safety?.dataset_selected_through_registry === true],
["raw_request_dataset_id_used_to_build_filesystem_path", res.safety?.raw_request_dataset_id_used_to_build_filesystem_path === false],
["absolute_source_path_disclosed", res.safety?.absolute_source_path_disclosed === false],
["operator_home_path_disclosed", res.safety?.operator_home_path_disclosed === false],
["local_storage_root_disclosed", res.safety?.local_storage_root_disclosed === false],
["public_read_only", res.safety?.public_read_only === true],
["public_mutation", res.safety?.public_mutation === false],
["public_post_upload", res.safety?.public_post_upload === false],
["public_shell_execution", res.safety?.public_shell_execution === false],
["ledger_write", res.safety?.ledger_write === false],
["wc_credit_award", res.safety?.wc_credit_award === false],
];

const failed = checks.filter((pair) => pair[1] === false).map((pair) => pair[0]);
if (failed.length > 0) {
console.error("Published dataset read route assertion failed:", failed.join(", "));
process.exit(1);
}
NODE

node - "$OUT/read-response.json" <<'NODELEAK'
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
console.error("Security Assertion Failed: private path or command hook leaked in read-route response.");
console.error("matched_literal=" + needle);
process.exit(1);
}
}

for (const pattern of regexPatterns) {
if (pattern.test(raw)) {
console.error("Security Assertion Failed: key material or token-like value leaked in read-route response.");
console.error("matched_pattern=" + pattern);
process.exit(1);
}
}
NODELEAK

BAD_CODE="$(curl -o /dev/null -s -w "%{http_code}" "$BAD_ENDPOINT" || true)"
if [ "$BAD_CODE" -lt 400 ]; then
echo "Security Assertion Failed: malformed traversal dataset id was not rejected."
echo "bad_code=$BAD_CODE"
exit 1
fi

MISSING_CODE="$(curl -o /dev/null -s -w "%{http_code}" "$MISSING_ENDPOINT" || true)"
if [ "$MISSING_CODE" != "404" ]; then
echo "Security Assertion Failed: missing safe dataset id did not return 404."
echo "missing_code=$MISSING_CODE"
exit 1
fi

POST_CODE="$(curl -o /dev/null -s -w "%{http_code}" -X POST "$ENDPOINT" || true)"
if [ "$POST_CODE" -lt 400 ]; then
echo "Security Assertion Failed: POST request was not rejected."
exit 1
fi

curl -fsS "$NODE_URL/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq "/public-node/datanet/published/:dataset_id/manifest-v1.json" "$OUT/route-index.json"

grep -Fq "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_DOC_V1" docs/public/public-node-datanet-published-dataset-read-route-v1.md

if grep -Fq "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_UI_V1" src/index.ts; then
echo "datanet_published_dataset_read_route_ui_marker_present=true"
else
echo "datanet_published_dataset_read_route_ui_marker_present=false"
exit 1
fi

echo "datanet_published_dataset_read_route_green=true"
echo "datanet_published_dataset_read_route_fixture_dataset_present=true"
echo "datanet_published_dataset_read_route_public_safe_manifest_returned=true"
echo "datanet_published_dataset_read_route_object_count=2"
echo "datanet_published_dataset_read_route_objects_returned=true"
echo "datanet_published_dataset_read_route_dataset_selected_through_registry=true"
echo "datanet_published_dataset_read_route_raw_request_dataset_id_used_to_build_filesystem_path=false"
echo "datanet_published_dataset_read_route_malformed_dataset_id_rejected=true"
echo "datanet_published_dataset_read_route_missing_dataset_returns_404=true"
echo "datanet_published_dataset_read_route_absolute_source_path_disclosed=false"
echo "datanet_published_dataset_read_route_operator_home_path_disclosed=false"
echo "datanet_published_dataset_read_route_local_storage_root_disclosed=false"
echo "datanet_published_dataset_read_route_public_mutation=false"
echo "datanet_published_dataset_read_route_ledger_write=false"
echo "datanet_published_dataset_read_route_wc_credit_award=false"
echo "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_PROOF_V1_GREEN"
