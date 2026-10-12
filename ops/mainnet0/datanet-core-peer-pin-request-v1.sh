#!/usr/bin/env bash
set -euo pipefail

PEER_BASE="${PEER_BASE:-${BASE:-http://127.0.0.1:4100}}"
SELECT_MODE="${SELECT_MODE:-auto}" # auto | published | mirrored
DATASET_ID="${DATASET_ID:-}"
MIRROR_NODE_LABEL="${MIRROR_NODE_LABEL:-}"
REQUESTER_NODE_LABEL="${REQUESTER_NODE_LABEL:-void-requester-node-local}"
TARGET_NODE_LABEL="${TARGET_NODE_LABEL:-void-peer-node}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-request-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_REQUEST_V1"
echo "peer_base=$PEER_BASE"
echo "select_mode=$SELECT_MODE"
echo "requester_node_label=$REQUESTER_NODE_LABEL"
echo "target_node_label=$TARGET_NODE_LABEL"
echo "out_dir=$OUT_DIR"

curl -fsS "$PEER_BASE/public-node/datanet/core-peer-pin-request-policy-v1.json" > "$OUT_DIR/pin-request-policy.json"
curl -fsS "$PEER_BASE/public-node/datanet/core-peer-availability-index-v1.json" > "$OUT_DIR/availability-index.json"

node - "$OUT_DIR/pin-request-policy.json" "$OUT_DIR/availability-index.json" "$OUT_DIR/selected.json" "$SELECT_MODE" "$DATASET_ID" "$MIRROR_NODE_LABEL" "$REQUESTER_NODE_LABEL" "$TARGET_NODE_LABEL" <<'NODE'
const fs = require("node:fs");

const policyFile = process.argv[2];
const indexFile = process.argv[3];
const selectedFile = process.argv[4];
const mode = process.argv[5] || "auto";
const datasetFilter = process.argv[6] || "";
const mirrorFilter = process.argv[7] || "";
const requesterNodeLabel = process.argv[8] || "";
const targetNodeLabel = process.argv[9] || "";

const policy = JSON.parse(fs.readFileSync(policyFile, "utf8"));
const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeId = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);

if (!safeId(requesterNodeLabel)) fail("requester_node_label_safe=false");
if (!safeId(targetNodeLabel)) fail("target_node_label_safe=false");

if (policy.marker !== "VOID_DATANET_CORE_PEER_PIN_REQUEST_POLICY_V1") fail("pin_request_policy_marker_valid=false");
if (policy.ok !== true) fail("pin_request_policy_ok=false");

const lane = policy.request_lane || {};
if (lane.request_packet_supported !== true) fail("pin_request_packet_supported=false");
if (lane.public_post_supported !== false) fail("pin_request_public_post_supported_not_false");
if (lane.automatic_mirror_supported !== false) fail("pin_request_automatic_mirror_supported_not_false");
if (lane.automatic_pin_supported !== false) fail("pin_request_automatic_pin_supported_not_false");
if (lane.operator_review_required !== true) fail("pin_request_operator_review_required=false");

if (index.marker !== "VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_V1") fail("peer_availability_index_marker_valid=false");
if (index.ok !== true) fail("peer_availability_index_ok=false");

const idxSafety = index.public_safety || {};
if (idxSafety.public_mutation !== false) fail("peer_index_public_mutation_not_false");
if (idxSafety.ledger_write !== false) fail("peer_index_ledger_write_not_false");
if (idxSafety.wc_credit_award !== false) fail("peer_index_wc_credit_award_not_false");

const published = Array.isArray(index.operator_published) ? index.operator_published : [];
const mirrored = Array.isArray(index.mirrored) ? index.mirrored : [];

const pubOk = (entry) =>
  entry &&
  entry.availability_type === "operator_published" &&
  safeId(entry.dataset_id) &&
  (!datasetFilter || entry.dataset_id === datasetFilter) &&
  entry.can_serve_manifest === true &&
  entry.can_serve_objects_by_sha256 === true &&
  entry.selected_from_registry === true &&
  isSha(entry.manifest_sha256) &&
  isSha(entry.content_root_sha256) &&
  Number(entry.object_count) > 0 &&
  Number(entry.total_bytes) >= 0 &&
  (entry.public_safety || {}).public_mutation === false &&
  (entry.public_safety || {}).ledger_write === false &&
  (entry.public_safety || {}).wc_credit_award === false;

const mirrorOk = (entry) =>
  entry &&
  entry.availability_type === "mirrored" &&
  safeId(entry.dataset_id) &&
  safeId(entry.mirror_node_label) &&
  (!datasetFilter || entry.dataset_id === datasetFilter) &&
  (!mirrorFilter || entry.mirror_node_label === mirrorFilter) &&
  entry.can_serve_receipt === true &&
  entry.can_serve_objects_by_sha256 === true &&
  entry.all_objects_fetched === true &&
  entry.all_object_sha256_verified === true &&
  entry.all_object_bytes_match_manifest === true &&
  isSha(entry.receipt_sha256) &&
  isSha(entry.manifest_sha256) &&
  isSha(entry.content_root_sha256) &&
  Number(entry.object_count) > 0 &&
  Number(entry.total_bytes) >= 0 &&
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

if (!selected) fail("pin_request_selected_entry_found=false");

fs.writeFileSync(selectedFile, JSON.stringify({
  selected_type: selectedType,
  selected
}, null, 2) + "\n");

console.log("pin_request_policy_marker_valid=true");
console.log("pin_request_operator_review_required=true");
console.log("peer_availability_index_marker_valid=true");
console.log("pin_request_selected_entry_found=true");
console.log("pin_request_selected_type=" + selectedType);
console.log("pin_request_selected_dataset_id=" + selected.dataset_id);
if (selectedType === "mirrored") console.log("pin_request_selected_mirror_node_label=" + selected.mirror_node_label);
console.log("pin_request_peer_index_public_mutation=false");
console.log("pin_request_peer_index_ledger_write=false");
console.log("pin_request_peer_index_wc_credit_award=false");
NODE

node - "$OUT_DIR/selected.json" "$OUT_DIR/pin-request.nohash.json" "$REQUESTER_NODE_LABEL" "$TARGET_NODE_LABEL" <<'NODE'
const fs = require("node:fs");

const selectedFile = process.argv[2];
const outFile = process.argv[3];
const requesterNodeLabel = process.argv[4];
const targetNodeLabel = process.argv[5];

const wrap = JSON.parse(fs.readFileSync(selectedFile, "utf8"));
const selected = wrap.selected || {};
const selectedType = wrap.selected_type;

const request = {
  marker: "VOID_DATANET_CORE_PEER_PIN_REQUEST_V1",
  version: 1,
  ok: true,
  requester_node_label: requesterNodeLabel,
  target_node_label: targetNodeLabel,
  requested_action: "operator_review_pin_or_mirror_dataset",
  request_lane: "out_of_band_operator_review_only",
  operator_review_required: true,
  automatic_mirror_requested: false,
  automatic_pin_requested: false,
  selected_type: selectedType,
  dataset_id: selected.dataset_id,
  mirror_node_label: selectedType === "mirrored" ? selected.mirror_node_label : null,
  manifest_sha256: selected.manifest_sha256,
  content_root_sha256: selected.content_root_sha256,
  object_count: selected.object_count,
  total_bytes: selected.total_bytes,
  receipt_sha256: selectedType === "mirrored" ? selected.receipt_sha256 : null,
  evidence: {
    peer_availability_index_fetched: true,
    selected_from_peer_availability_index: true,
    peer_advertised_can_serve: true,
    peer_content_verification_recommended_before_operator_approval: true
  },
  public_safety: {
    public_safe_request_packet: true,
    public_post_upload: false,
    public_shell_execution: false,
    public_mutation: false,
    automatic_mirror: false,
    automatic_pin: false,
    ledger_write: false,
    wc_credit_award: false,
    local_path_disclosed: false,
    absolute_path_disclosed: false,
    operator_home_path_disclosed: false,
    local_storage_root_disclosed: false
  }
};

fs.writeFileSync(outFile, JSON.stringify(request, null, 2) + "\n");
NODE

REQUEST_ID="$(sha256sum "$OUT_DIR/pin-request.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/pin-request.nohash.json" "$OUT_DIR/pin-request.json" "$REQUEST_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const requestId = process.argv[4];

const request = JSON.parse(fs.readFileSync(input, "utf8"));
request.request_id = requestId;
request.request_id_scope = "sha256 over request packet without request_id fields";

fs.writeFileSync(output, JSON.stringify(request, null, 2) + "\n");
NODE

node - "$OUT_DIR/pin-request.json" <<'NODE'
const fs = require("node:fs");
const req = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (req.marker !== "VOID_DATANET_CORE_PEER_PIN_REQUEST_V1") fail("pin_request_marker_valid=false");
if (req.ok !== true) fail("pin_request_ok=false");
if (!isSha(req.request_id)) fail("pin_request_id_valid=false");
if (req.operator_review_required !== true) fail("pin_request_operator_review_required=false");
if (req.automatic_mirror_requested !== false) fail("pin_request_automatic_mirror_requested_not_false");
if (req.automatic_pin_requested !== false) fail("pin_request_automatic_pin_requested_not_false");
if (!isSha(req.manifest_sha256)) fail("pin_request_manifest_sha256_valid=false");
if (!isSha(req.content_root_sha256)) fail("pin_request_content_root_sha256_valid=false");

const safety = req.public_safety || {};
if (safety.public_safe_request_packet !== true) fail("pin_request_public_safe_packet=false");
if (safety.public_post_upload !== false) fail("pin_request_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("pin_request_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("pin_request_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("pin_request_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("pin_request_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("pin_request_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_request_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("pin_request_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("pin_request_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("pin_request_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("pin_request_local_storage_root_disclosed_not_false");

console.log("pin_request_marker_valid=true");
console.log("pin_request_id_valid=true");
console.log("pin_request_operator_review_required=true");
console.log("pin_request_automatic_mirror_requested=false");
console.log("pin_request_automatic_pin_requested=false");
console.log("pin_request_public_mutation=false");
console.log("pin_request_ledger_write=false");
console.log("pin_request_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/pin-request.json"; then
  echo "pin_request_private_leak_scan_green=false"
  exit 1
fi

echo "pin_request_packet_created=true"
echo "pin_request_packet_path=$OUT_DIR/pin-request.json"
echo "pin_request_id=$REQUEST_ID"
echo "pin_request_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN"
