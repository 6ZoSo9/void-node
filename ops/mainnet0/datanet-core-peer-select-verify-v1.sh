#!/usr/bin/env bash
set -euo pipefail

PEER_BASE="${PEER_BASE:-${BASE:-http://127.0.0.1:4100}}"
SELECT_MODE="${SELECT_MODE:-auto}" # auto | published | mirrored
DATASET_ID="${DATASET_ID:-}"
MIRROR_NODE_LABEL="${MIRROR_NODE_LABEL:-}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-select-verify-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

SAFE_ID_RE='^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$'
SHA_RE='^[a-f0-9]{64}$'

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_SELECT_VERIFY_V1"
echo "peer_base=$PEER_BASE"
echo "select_mode=$SELECT_MODE"
echo "out_dir=$OUT_DIR"

curl -fsS "$PEER_BASE/public-node/datanet/core-peer-availability-index-v1.json" > "$OUT_DIR/availability-index.json"

node - "$OUT_DIR/availability-index.json" "$OUT_DIR/selected.env" "$SELECT_MODE" "$DATASET_ID" "$MIRROR_NODE_LABEL" <<'NODE'
const fs = require("node:fs");

const indexFile = process.argv[2];
const envFile = process.argv[3];
const mode = process.argv[4] || "auto";
const datasetFilter = process.argv[5] || "";
const mirrorFilter = process.argv[6] || "";

const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (index.marker !== "VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_V1") fail("peer_availability_index_marker_valid=false");
if (index.ok !== true) fail("peer_availability_index_ok=false");

const safety = index.public_safety || {};
if (safety.public_mutation !== false) fail("peer_index_public_mutation_not_false");
if (safety.ledger_write !== false) fail("peer_index_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("peer_index_wc_credit_award_not_false");

const published = Array.isArray(index.operator_published) ? index.operator_published : [];
const mirrored = Array.isArray(index.mirrored) ? index.mirrored : [];

const pubOk = (entry) =>
  entry &&
  entry.availability_type === "operator_published" &&
  (!datasetFilter || entry.dataset_id === datasetFilter) &&
  entry.can_serve_manifest === true &&
  entry.can_serve_objects_by_sha256 === true &&
  entry.selected_from_registry === true &&
  isSha(entry.manifest_sha256) &&
  isSha(entry.content_root_sha256) &&
  Number(entry.object_count) > 0 &&
  (entry.public_safety || {}).public_mutation === false &&
  (entry.public_safety || {}).ledger_write === false &&
  (entry.public_safety || {}).wc_credit_award === false;

const mirrorOk = (entry) =>
  entry &&
  entry.availability_type === "mirrored" &&
  (!datasetFilter || entry.dataset_id === datasetFilter) &&
  (!mirrorFilter || entry.mirror_node_label === mirrorFilter) &&
  entry.can_serve_receipt === true &&
  entry.can_serve_objects_by_sha256 === true &&
  entry.all_objects_fetched === true &&
  entry.all_object_sha256_verified === true &&
  entry.all_object_bytes_match_manifest === true &&
  isSha(entry.manifest_sha256) &&
  isSha(entry.content_root_sha256) &&
  Number(entry.object_count) > 0 &&
  (entry.public_safety || {}).public_mutation === false &&
  (entry.public_safety || {}).ledger_write === false &&
  (entry.public_safety || {}).wc_credit_award === false;

let selected = null;
let selectedType = "";

if (mode === "mirrored" || mode === "auto") {
  selected = mirrored.find(mirrorOk);
  selectedType = selected ? "mirrored" : "";
}

if (!selected && (mode === "published" || mode === "auto")) {
  selected = published.find(pubOk);
  selectedType = selected ? "operator_published" : "";
}

if (!selected) fail("peer_select_verify_selected_entry_found=false");

const lines = [
  "SELECTED_TYPE=" + selectedType,
  "DATASET_ID=" + selected.dataset_id,
  "ADVERTISED_MANIFEST_SHA256=" + selected.manifest_sha256,
  "ADVERTISED_CONTENT_ROOT_SHA256=" + selected.content_root_sha256,
  "ADVERTISED_OBJECT_COUNT=" + selected.object_count,
  "ADVERTISED_TOTAL_BYTES=" + selected.total_bytes
];

if (selectedType === "mirrored") {
  lines.push("MIRROR_NODE_LABEL=" + selected.mirror_node_label);
  lines.push("ADVERTISED_RECEIPT_SHA256=" + selected.receipt_sha256);
}

fs.writeFileSync(envFile, lines.join("\n") + "\n");

console.log("peer_availability_index_marker_valid=true");
console.log("peer_select_verify_selected_entry_found=true");
console.log("selected_type=" + selectedType);
console.log("selected_dataset_id=" + selected.dataset_id);
if (selectedType === "mirrored") console.log("selected_mirror_node_label=" + selected.mirror_node_label);
console.log("peer_index_public_mutation=false");
console.log("peer_index_ledger_write=false");
console.log("peer_index_wc_credit_award=false");
NODE

cat "$OUT_DIR/selected.env"
. "$OUT_DIR/selected.env"

if ! printf '%s' "$DATASET_ID" | grep -Eq "$SAFE_ID_RE"; then
  echo "selected_dataset_id_safe=false"
  exit 1
fi

if [ "$SELECTED_TYPE" = "operator_published" ]; then
  curl -fsS "$PEER_BASE/public-node/datanet/published/${DATASET_ID}/manifest-v1.json" > "$OUT_DIR/manifest-route.json"

  node - "$OUT_DIR/manifest-route.json" "$OUT_DIR/object.env" "$ADVERTISED_MANIFEST_SHA256" "$ADVERTISED_CONTENT_ROOT_SHA256" "$ADVERTISED_OBJECT_COUNT" <<'NODE'
const fs = require("node:fs");

const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const objectEnv = process.argv[3];
const advertisedManifestSha = process.argv[4];
const advertisedContentRoot = process.argv[5];
const advertisedObjectCount = Number(process.argv[6]);

const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (manifest.marker !== "VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_V1") fail("published_manifest_route_marker_valid=false");
if (manifest.ok !== true) fail("published_manifest_route_ok=false");
if (manifest.selected_from_registry !== true) fail("published_manifest_selected_from_registry=false");
if (manifest.manifest_sha256 !== advertisedManifestSha) fail("published_manifest_sha_matches_advertised=false");
if (manifest.content_root_sha256 !== advertisedContentRoot) fail("published_content_root_matches_advertised=false");
if (Number(manifest.object_count) !== advertisedObjectCount) fail("published_object_count_matches_advertised=false");

const safety = manifest.safety || {};
if (safety.public_safe_manifest !== true) fail("published_public_safe_manifest=false");
if (safety.public_mutation !== false) fail("published_public_mutation_not_false");
if (safety.ledger_write !== false) fail("published_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("published_wc_credit_award_not_false");

if (!Array.isArray(manifest.objects) || manifest.objects.length < 1) fail("published_manifest_objects_present=false");

const first = manifest.objects[0];
if (!isSha(first.sha256)) fail("published_first_object_sha_valid=false");

fs.writeFileSync(objectEnv, [
  "OBJECT_SHA=" + first.sha256,
  "OBJECT_BYTES=" + first.bytes,
  "OBJECT_SOURCE=published_manifest"
].join("\n") + "\n");

console.log("published_manifest_route_marker_valid=true");
console.log("published_manifest_matches_advertised=true");
console.log("published_manifest_public_safe=true");
console.log("published_manifest_public_mutation=false");
console.log("published_manifest_ledger_write=false");
console.log("published_manifest_wc_credit_award=false");
NODE

  cat "$OUT_DIR/object.env"
  . "$OUT_DIR/object.env"

  curl -fsS "$PEER_BASE/public-node/datanet/published/${DATASET_ID}/object/${OBJECT_SHA}" \
    -o "$OUT_DIR/object.blob"

elif [ "$SELECTED_TYPE" = "mirrored" ]; then
  if ! printf '%s' "$MIRROR_NODE_LABEL" | grep -Eq "$SAFE_ID_RE"; then
    echo "selected_mirror_node_label_safe=false"
    exit 1
  fi

  curl -fsS "$PEER_BASE/public-node/datanet/core-mirror/${MIRROR_NODE_LABEL}/${DATASET_ID}/receipt-v1.json" > "$OUT_DIR/mirror-receipt-route.json"

  node - "$OUT_DIR/mirror-receipt-route.json" "$OUT_DIR/object.env" "$ADVERTISED_MANIFEST_SHA256" "$ADVERTISED_CONTENT_ROOT_SHA256" "$ADVERTISED_OBJECT_COUNT" "$MIRROR_NODE_LABEL" <<'NODE'
const fs = require("node:fs");

const route = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const objectEnv = process.argv[3];
const advertisedManifestSha = process.argv[4];
const advertisedContentRoot = process.argv[5];
const advertisedObjectCount = Number(process.argv[6]);
const expectedMirrorNode = process.argv[7];

const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (route.marker !== "VOID_DATANET_CORE_MIRROR_SERVE_RECEIPT_V1") fail("mirror_receipt_route_marker_valid=false");
if (route.ok !== true) fail("mirror_receipt_route_ok=false");
if (route.selected_from_mirror_registry !== true) fail("mirror_receipt_selected_from_registry=false");

const receipt = route.receipt || {};
if (receipt.marker !== "VOID_DATANET_CORE_MIRROR_LOOP_RECEIPT_V1") fail("mirror_loop_receipt_marker_valid=false");
if (receipt.mirror_node_label !== expectedMirrorNode) fail("mirror_node_label_matches_selected=false");

const manifest = receipt.manifest_read || {};
if (manifest.manifest_sha256 !== advertisedManifestSha) fail("mirror_manifest_sha_matches_advertised=false");
if (manifest.content_root_sha256 !== advertisedContentRoot) fail("mirror_content_root_matches_advertised=false");

const mirror = receipt.object_mirror || {};
if (Number(mirror.object_count) !== advertisedObjectCount) fail("mirror_object_count_matches_advertised=false");
if (mirror.all_objects_fetched !== true) fail("mirror_all_objects_fetched=false");
if (mirror.all_object_sha256_verified !== true) fail("mirror_all_object_sha256_verified=false");
if (mirror.all_object_bytes_match_manifest !== true) fail("mirror_all_object_bytes_match_manifest=false");

const safety = route.mirror_serve_safety || {};
if (safety.receipt_public_safe !== true) fail("mirror_receipt_public_safe=false");
if (safety.public_mutation !== false) fail("mirror_public_mutation_not_false");
if (safety.ledger_write !== false) fail("mirror_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("mirror_wc_credit_award_not_false");

if (!Array.isArray(mirror.objects) || mirror.objects.length < 1) fail("mirror_receipt_objects_present=false");

const first = mirror.objects[0];
if (!isSha(first.sha256)) fail("mirror_first_object_sha_valid=false");

fs.writeFileSync(objectEnv, [
  "OBJECT_SHA=" + first.sha256,
  "OBJECT_BYTES=" + first.bytes,
  "OBJECT_SOURCE=mirror_receipt"
].join("\n") + "\n");

console.log("mirror_receipt_route_marker_valid=true");
console.log("mirror_receipt_matches_advertised=true");
console.log("mirror_receipt_public_safe=true");
console.log("mirror_receipt_public_mutation=false");
console.log("mirror_receipt_ledger_write=false");
console.log("mirror_receipt_wc_credit_award=false");
NODE

  cat "$OUT_DIR/object.env"
  . "$OUT_DIR/object.env"

  curl -fsS -D "$OUT_DIR/object.headers" \
    "$PEER_BASE/public-node/datanet/core-mirror/${MIRROR_NODE_LABEL}/${DATASET_ID}/object/${OBJECT_SHA}" \
    -o "$OUT_DIR/object.blob"

  grep -Fiq 'X-VOID-Marker: VOID_DATANET_CORE_MIRROR_OBJECT_FETCH_V1' "$OUT_DIR/object.headers"
  grep -Fiq 'X-VOID-Object-Sha256-Verified: true' "$OUT_DIR/object.headers"
  grep -Fiq 'X-VOID-Public-Mutation: false' "$OUT_DIR/object.headers"
  grep -Fiq 'X-VOID-Ledger-Write: false' "$OUT_DIR/object.headers"
  grep -Fiq 'X-VOID-WC-Credit-Award: false' "$OUT_DIR/object.headers"
else
  echo "selected_type_valid=false"
  exit 1
fi

if ! printf '%s' "$OBJECT_SHA" | grep -Eq "$SHA_RE"; then
  echo "selected_object_sha_valid=false"
  exit 1
fi

ACTUAL_SHA="$(sha256sum "$OUT_DIR/object.blob" | awk '{print $1}')"
ACTUAL_BYTES="$(wc -c < "$OUT_DIR/object.blob" | tr -d ' ')"

if [ "$ACTUAL_SHA" != "$OBJECT_SHA" ]; then
  echo "selected_object_sha256_verified=false"
  exit 1
fi

if [ "$ACTUAL_BYTES" != "$OBJECT_BYTES" ]; then
  echo "selected_object_bytes_match_advertised_route=false"
  exit 1
fi

node - "$OUT_DIR/peer-select-verify-receipt.nohash.json" "$SELECTED_TYPE" "$DATASET_ID" "${MIRROR_NODE_LABEL:-}" "$OBJECT_SHA" "$ACTUAL_BYTES" "$ADVERTISED_MANIFEST_SHA256" "$ADVERTISED_CONTENT_ROOT_SHA256" <<'NODE'
const fs = require("node:fs");

const out = process.argv[2];
const selectedType = process.argv[3];
const datasetId = process.argv[4];
const mirrorNodeLabel = process.argv[5] || "";
const objectSha = process.argv[6];
const objectBytes = Number(process.argv[7]);
const manifestSha = process.argv[8];
const contentRoot = process.argv[9];

const receipt = {
  marker: "VOID_DATANET_CORE_PEER_SELECT_VERIFY_RECEIPT_V1",
  version: 1,
  ok: true,
  selected_type: selectedType,
  dataset_id: datasetId,
  mirror_node_label: selectedType === "mirrored" ? mirrorNodeLabel : null,
  advertised: {
    manifest_sha256: manifestSha,
    content_root_sha256: contentRoot
  },
  verification: {
    peer_availability_index_fetched: true,
    advertised_entry_selected: true,
    manifest_or_receipt_fetched: true,
    object_fetched: true,
    selected_object_sha256: objectSha,
    selected_object_bytes: objectBytes,
    selected_object_sha256_verified: true,
    selected_object_bytes_verified: true
  },
  public_safety: {
    receipt_public_safe: true,
    local_path_disclosed: false,
    absolute_path_disclosed: false,
    operator_home_path_disclosed: false,
    local_storage_root_disclosed: false,
    public_mutation: false,
    ledger_write: false,
    wc_credit_award: false
  }
};

fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");
NODE

RECEIPT_SHA="$(sha256sum "$OUT_DIR/peer-select-verify-receipt.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/peer-select-verify-receipt.nohash.json" "$OUT_DIR/peer-select-verify-receipt.json" "$RECEIPT_SHA" <<'NODE'
const fs = require("node:fs");
const input = process.argv[2];
const output = process.argv[3];
const receiptSha = process.argv[4];

const receipt = JSON.parse(fs.readFileSync(input, "utf8"));
receipt.peer_select_verify_receipt = {
  receipt_sha256: receiptSha,
  receipt_hash_scope: "sha256 over receipt without peer_select_verify_receipt field"
};

fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/peer-select-verify-receipt.json"; then
  echo "peer_select_verify_private_leak_scan_green=false"
  exit 1
fi

echo "selected_object_sha256_verified=true"
echo "selected_object_bytes_verified=true"
echo "peer_select_verify_receipt_created=true"
echo "peer_select_verify_receipt_sha256=$RECEIPT_SHA"
echo "peer_select_verify_private_leak_scan_green=true"
echo "peer_select_verify_public_mutation=false"
echo "peer_select_verify_ledger_write=false"
echo "peer_select_verify_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_SELECT_VERIFY_V1_GREEN"
