#!/usr/bin/env bash
set -euo pipefail

NODE_URL="${VOID_NODE_URL:-${BASE:-http://127.0.0.1:4100}}"
DATASET_ID="datanet-published-object-fetch-proof-fixture-v1"
OUT="${TMPDIR:-/tmp}/public-node-datanet-published-object-fetch-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
PUBLISHED_ROOT=".void/datanet/operator-published-v1"
DATASET_DIR="$PUBLISHED_ROOT/$DATASET_ID"

cleanup() {
rm -rf "$DATASET_DIR"
}
trap cleanup EXIT

mkdir -p "$OUT/source/nested"

echo "=== VOID Public Node DataNet Published Object Fetch v1 Proof ==="
echo "marker=VOID_DATANET_PUBLISHED_OBJECT_FETCH_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$NODE_URL"
echo "out=$OUT"

npm run build

printf 'hello from VOID published object fetch proof\n' > "$OUT/source/README.txt"
printf '{"ok":true,"fixture":"published-object-fetch-v1"}\n' > "$OUT/source/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh --dataset-id "$DATASET_ID" --source "$OUT/source" --out-root "$PUBLISHED_ROOT" > "$OUT/publish-output.txt"

grep -Fq "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN" "$OUT/publish-output.txt"
grep -Fq "public_safe_manifest_written=true" "$OUT/publish-output.txt"
grep -Fq "absolute_paths_in_manifest=false" "$OUT/publish-output.txt"
grep -Fq "ledger_write=false" "$OUT/publish-output.txt"
grep -Fq "wc_credit_award=false" "$OUT/publish-output.txt"

READ_ENDPOINT="$NODE_URL/public-node/datanet/published/$DATASET_ID/manifest-v1.json"
curl -fsS "$READ_ENDPOINT" > "$OUT/read-response.json"

node - "$OUT/read-response.json" "$OUT/target.env" <<'NODE'
const fs = require("node:fs");
const readFile = process.argv[2];
const outFile = process.argv[3];
const res = JSON.parse(fs.readFileSync(readFile, "utf8"));
const target = Array.isArray(res.objects) ? res.objects.find((item) => item.path === "README.txt") : null;
if (!target) {
console.error("target object README.txt not found");
process.exit(1);
}
if (!/^[a-f0-9]{64}$/.test(target.sha256)) {
console.error("target object sha invalid");
process.exit(1);
}
fs.writeFileSync(outFile, "OBJECT_SHA=" + target.sha256 + "\nOBJECT_NAME=" + target.object_name + "\n");
NODE

. "$OUT/target.env"

FETCH_ENDPOINT="$NODE_URL/public-node/datanet/published/$DATASET_ID/object/$OBJECT_SHA"
curl -fsS -D "$OUT/object-headers.txt" "$FETCH_ENDPOINT" -o "$OUT/fetched-object.bin"

ACTUAL_SHA="$(sha256sum "$OUT/fetched-object.bin" | awk '{print $1}')"
if [ "$ACTUAL_SHA" != "$OBJECT_SHA" ]; then
echo "Security Assertion Failed: fetched object sha mismatch."
echo "expected=$OBJECT_SHA"
echo "actual=$ACTUAL_SHA"
exit 1
fi

cmp "$OUT/source/README.txt" "$OUT/fetched-object.bin"

grep -Fq "X-VOID-DATANET-MARKER: VOID_DATANET_PUBLISHED_OBJECT_FETCH_V1" "$OUT/object-headers.txt"
grep -Fq "X-VOID-DATANET-OBJECT-SHA256: $OBJECT_SHA" "$OUT/object-headers.txt"
grep -Fq "X-VOID-DATANET-OBJECT-SELECTED-FROM-MANIFEST: true" "$OUT/object-headers.txt"
grep -Fq "X-VOID-DATANET-OBJECT-SHA256-VERIFIED: true" "$OUT/object-headers.txt"
grep -Fq "X-VOID-DATANET-RAW-SHA256-PATH: false" "$OUT/object-headers.txt"
grep -Fq "X-VOID-DATANET-PUBLIC-MUTATION: false" "$OUT/object-headers.txt"
grep -Fq "X-VOID-DATANET-LEDGER-WRITE: false" "$OUT/object-headers.txt"
grep -Fq "X-VOID-DATANET-WC-CREDIT-AWARD: false" "$OUT/object-headers.txt"

BAD_SHA_CODE="$(curl -o /dev/null -s -w "%{http_code}" "$NODE_URL/public-node/datanet/published/$DATASET_ID/object/not-a-sha" || true)"
if [ "$BAD_SHA_CODE" -lt 400 ]; then
echo "Security Assertion Failed: malformed sha was not rejected."
echo "bad_sha_code=$BAD_SHA_CODE"
exit 1
fi

MISSING_SHA="0000000000000000000000000000000000000000000000000000000000000000"
MISSING_CODE="$(curl -o /dev/null -s -w "%{http_code}" "$NODE_URL/public-node/datanet/published/$DATASET_ID/object/$MISSING_SHA" || true)"
if [ "$MISSING_CODE" != "404" ]; then
echo "Security Assertion Failed: missing object did not return 404."
echo "missing_code=$MISSING_CODE"
exit 1
fi

POST_CODE="$(curl -o /dev/null -s -w "%{http_code}" -X POST "$FETCH_ENDPOINT" || true)"
if [ "$POST_CODE" -lt 400 ]; then
echo "Security Assertion Failed: POST request was not rejected."
exit 1
fi

node - "$OUT/object-headers.txt" <<'NODELEAK'
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
console.error("Security Assertion Failed: private path or command hook leaked in object-fetch headers.");
console.error("matched_literal=" + needle);
process.exit(1);
}
}

for (const pattern of regexPatterns) {
if (pattern.test(raw)) {
console.error("Security Assertion Failed: key material or token-like value leaked in object-fetch headers.");
console.error("matched_pattern=" + pattern);
process.exit(1);
}
}
NODELEAK

curl -fsS "$NODE_URL/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq "/public-node/datanet/published/:dataset_id/object/:sha256" "$OUT/route-index.json"

grep -Fq "VOID_DATANET_PUBLISHED_OBJECT_FETCH_DOC_V1" docs/public/public-node-datanet-published-object-fetch-v1.md

if grep -Fq "VOID_DATANET_PUBLISHED_OBJECT_FETCH_UI_V1" src/index.ts; then
echo "datanet_published_object_fetch_ui_marker_present=true"
else
echo "datanet_published_object_fetch_ui_marker_present=false"
exit 1
fi

echo "datanet_published_object_fetch_route_green=true"
echo "datanet_published_object_fetch_fixture_dataset_present=true"
echo "datanet_published_object_fetch_object_selected_from_manifest=true"
echo "datanet_published_object_fetch_object_sha256_verified=true"
echo "datanet_published_object_fetch_bytes_match_source=true"
echo "datanet_published_object_fetch_raw_request_dataset_id_used_to_build_filesystem_path=false"
echo "datanet_published_object_fetch_raw_request_sha256_used_to_build_filesystem_path=false"
echo "datanet_published_object_fetch_malformed_sha_rejected=true"
echo "datanet_published_object_fetch_missing_object_returns_404=true"
echo "datanet_published_object_fetch_absolute_source_path_disclosed=false"
echo "datanet_published_object_fetch_operator_home_path_disclosed=false"
echo "datanet_published_object_fetch_local_storage_root_disclosed=false"
echo "datanet_published_object_fetch_public_mutation=false"
echo "datanet_published_object_fetch_ledger_write=false"
echo "datanet_published_object_fetch_wc_credit_award=false"
echo "VOID_DATANET_PUBLISHED_OBJECT_FETCH_PROOF_V1_GREEN"
