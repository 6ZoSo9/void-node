#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="${DATASET_ID:-datanet-core-mirror-loop-fixture-v1}"
MIRROR_NODE_LABEL="${MIRROR_NODE_LABEL:-void-mirror-node-local}"
MIRROR_ROOT="${VOID_DATANET_CORE_MIRROR_ROOT:-.void/datanet/core-mirror-v1}"

SAFE_ID_RE='^[a-z0-9][a-z0-9._-]{2,96}$'
SHA_RE='^[a-f0-9]{64}$'

if ! printf '%s' "$DATASET_ID" | grep -Eq "$SAFE_ID_RE"; then
  echo "dataset_id_safe=false"
  exit 1
fi

SAFE_NODE_LABEL="$(printf '%s' "$MIRROR_NODE_LABEL" | tr -c 'A-Za-z0-9._-' '_' | sed 's/^_*//;s/_*$//')"
if [ -z "$SAFE_NODE_LABEL" ]; then
  SAFE_NODE_LABEL="unknown-node"
fi

OUT="${MIRROR_ROOT}/${SAFE_NODE_LABEL}/${DATASET_ID}"
TMP="${TMPDIR:-/tmp}/void-datanet-core-mirror-loop-v1-${SAFE_NODE_LABEL}-${DATASET_ID}-$$"

rm -rf "$TMP"
mkdir -p "$TMP" "$OUT/objects" "$OUT/receipts"

echo "VOID_DATANET_CORE_MIRROR_LOOP_V1"
echo "base=$BASE"
echo "dataset_id=$DATASET_ID"
echo "mirror_node_label=$SAFE_NODE_LABEL"

curl -fsS "$BASE/public-node/datanet/published/${DATASET_ID}/manifest-v1.json" > "$TMP/manifest-route.json"

node - "$TMP/manifest-route.json" "$TMP/objects.tsv" > "$TMP/manifest.env" <<'NODE'
const fs = require("node:fs");

const manifestFile = process.argv[2];
const objectsOut = process.argv[3];
const res = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const isSafePath = (v) =>
  typeof v === "string" &&
  v.length > 0 &&
  !v.startsWith("/") &&
  !v.includes("..") &&
  !v.includes("\\") &&
  !v.includes("\0");

if (res.marker !== "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1") fail("manifest_route_marker_valid=false");
if (res.ok !== true) fail("manifest_route_ok=false");
if (res.dataset_id === undefined || typeof res.dataset_id !== "string") fail("dataset_id_present=false");
if (res.selected_from_registry !== true) fail("selected_from_registry=false");
if (!isSha(res.manifest_sha256)) fail("manifest_sha256_valid=false");
if (!isSha(res.content_root_sha256)) fail("content_root_sha256_valid=false");
if (!Array.isArray(res.objects) || res.objects.length < 1) fail("object_array_present=false");

const safety = res.safety || {};
if (safety.public_safe_manifest !== true) fail("public_safe_manifest=false");
if (safety.dataset_selected_through_registry !== true) fail("dataset_selected_through_registry=false");
if (safety.raw_request_dataset_id_used_to_build_filesystem_path !== false) fail("raw_request_dataset_id_used_to_build_filesystem_path_not_false");
if (safety.absolute_source_path_disclosed !== false) fail("absolute_source_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("local_storage_root_disclosed_not_false");
if (safety.storage_root_disclosed !== false) fail("storage_root_disclosed_not_false");
if (safety.public_mutation !== false) fail("public_mutation_not_false");
if (safety.ledger_write !== false) fail("ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("wc_credit_award_not_false");

const lines = [];
for (const obj of res.objects) {
  const rel = obj.path;
  const sha = obj.sha256;
  const bytes = Number(obj.bytes);
  if (!isSafePath(rel)) fail("object_relative_path_safe=false");
  if (!isSha(sha)) fail("object_sha256_valid=false");
  if (!Number.isSafeInteger(bytes) || bytes < 0) fail("object_bytes_valid=false");
  lines.push([rel, bytes, sha].join("\t"));
}

fs.writeFileSync(objectsOut, lines.join("\n") + "\n");

console.log("manifest_route_marker_valid=true");
console.log("manifest_route_ok=true");
console.log("dataset_id=" + res.dataset_id);
console.log("selected_from_registry=true");
console.log("manifest_sha256=" + res.manifest_sha256);
console.log("content_root_sha256=" + res.content_root_sha256);
console.log("object_count=" + res.objects.length);
console.log("public_safe_manifest=true");
console.log("dataset_selected_through_registry=true");
console.log("raw_request_dataset_id_used_to_build_filesystem_path=false");
console.log("public_mutation=false");
console.log("ledger_write=false");
console.log("wc_credit_award=false");
NODE

cat "$TMP/manifest.env"

cp "$TMP/manifest-route.json" "$OUT/manifest-public-route.json"

OBJECT_COUNT=0
TOTAL_BYTES=0

while IFS=$'\t' read -r REL BYTES SHA; do
  [ -n "${SHA:-}" ] || continue

  if ! printf '%s' "$SHA" | grep -Eq "$SHA_RE"; then
    echo "object_sha256_valid=false"
    exit 1
  fi

  FETCH_TMP="$TMP/${SHA}.blob"
  TARGET="$OUT/objects/${SHA}.blob"

  curl -fsS "$BASE/public-node/datanet/published/${DATASET_ID}/object/${SHA}" > "$FETCH_TMP"

  ACTUAL_SHA="$(sha256sum "$FETCH_TMP" | awk '{print $1}')"
  ACTUAL_BYTES="$(wc -c < "$FETCH_TMP" | tr -d ' ')"

  if [ "$ACTUAL_SHA" != "$SHA" ]; then
    echo "object_sha256_verified=false"
    echo "expected_sha=$SHA"
    echo "actual_sha=$ACTUAL_SHA"
    exit 1
  fi

  if [ "$ACTUAL_BYTES" != "$BYTES" ]; then
    echo "object_bytes_match_manifest=false"
    echo "expected_bytes=$BYTES"
    echo "actual_bytes=$ACTUAL_BYTES"
    exit 1
  fi

  cp "$FETCH_TMP" "$TARGET"

  OBJECT_COUNT=$((OBJECT_COUNT + 1))
  TOTAL_BYTES=$((TOTAL_BYTES + ACTUAL_BYTES))

  echo "mirrored_object_sha256=$SHA"
  echo "mirrored_object_bytes=$ACTUAL_BYTES"
done < "$TMP/objects.tsv"

node - "$TMP/manifest.env" "$TMP/objects.tsv" "$OUT/receipts/core-mirror-loop-receipt.nohash.json" "$SAFE_NODE_LABEL" "$OBJECT_COUNT" "$TOTAL_BYTES" <<'NODE'
const fs = require("node:fs");

const envFile = process.argv[2];
const objectsFile = process.argv[3];
const outFile = process.argv[4];
const mirrorNodeLabel = process.argv[5];
const objectCount = Number(process.argv[6]);
const totalBytes = Number(process.argv[7]);

const env = {};
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const idx = line.indexOf("=");
  if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1);
}

const objects = fs.readFileSync(objectsFile, "utf8")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [path, bytes, sha256] = line.split("\t");
    return { path, bytes: Number(bytes), sha256 };
  });

const receipt = {
  marker: "VOID_DATANET_CORE_MIRROR_LOOP_RECEIPT_V1",
  version: 1,
  ok: true,
  dataset_id: env.dataset_id,
  mirror_node_label: mirrorNodeLabel,
  source_base_public_route_used: true,
  manifest_read: {
    route_marker: "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1",
    selected_from_registry: true,
    manifest_sha256: env.manifest_sha256,
    content_root_sha256: env.content_root_sha256,
    public_safe_manifest: true
  },
  object_mirror: {
    object_count: objectCount,
    total_bytes: totalBytes,
    objects,
    all_objects_fetched: true,
    all_object_sha256_verified: true,
    all_object_bytes_match_manifest: true
  },
  public_safety: {
    mirror_receipt_public_safe: true,
    local_mirror_path_disclosed: false,
    absolute_path_disclosed: false,
    operator_home_path_disclosed: false,
    local_storage_root_disclosed: false,
    public_mutation: false,
    ledger_write: false,
    wc_credit_award: false
  },
  next_step: "Run the same mirror loop from a second node against the first node public DataNet route."
};

fs.writeFileSync(outFile, JSON.stringify(receipt, null, 2) + "\n");
NODE

RECEIPT_HASH="$(sha256sum "$OUT/receipts/core-mirror-loop-receipt.nohash.json" | awk '{print $1}')"

node - "$OUT/receipts/core-mirror-loop-receipt.nohash.json" "$OUT/receipts/core-mirror-loop-receipt.json" "$RECEIPT_HASH" <<'NODE'
const fs = require("node:fs");
const input = process.argv[2];
const output = process.argv[3];
const receiptSha256 = process.argv[4];

const receipt = JSON.parse(fs.readFileSync(input, "utf8"));
receipt.retrieval_receipt = {
  receipt_sha256: receiptSha256,
  receipt_hash_scope: "sha256 over receipt without retrieval_receipt field"
};

fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
NODE

if grep -Eq '/home/|/mnt/|/tmp/|\.void/datanet/core-mirror-v1|zoso' "$OUT/receipts/core-mirror-loop-receipt.json"; then
  echo "mirror_receipt_private_path_leak_scan_green=false"
  exit 1
fi

echo "mirrored_object_count=$OBJECT_COUNT"
echo "mirrored_total_bytes=$TOTAL_BYTES"
echo "mirror_receipt_created=true"
echo "mirror_receipt_sha256=$RECEIPT_HASH"
echo "mirror_receipt_public_safe=true"
echo "mirror_receipt_private_path_leak_scan_green=true"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN"
