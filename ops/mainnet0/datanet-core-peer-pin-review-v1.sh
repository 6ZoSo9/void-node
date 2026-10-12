#!/usr/bin/env bash
set -euo pipefail

PIN_REQUEST_FILE="${PIN_REQUEST_FILE:-}"
SOURCE_PEER_BASE="${SOURCE_PEER_BASE:-${PEER_BASE:-${BASE:-http://127.0.0.1:4100}}}"
REVIEWER_NODE_LABEL="${REVIEWER_NODE_LABEL:-void-reviewer-node-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-review-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$PIN_REQUEST_FILE" ]; then
  echo "pin_request_file_required=false"
  exit 1
fi

if [ ! -f "$PIN_REQUEST_FILE" ]; then
  echo "pin_request_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_REVIEW_V1"
echo "source_peer_base=$SOURCE_PEER_BASE"
echo "reviewer_node_label=$REVIEWER_NODE_LABEL"
echo "out_dir=$OUT_DIR"

cp "$PIN_REQUEST_FILE" "$OUT_DIR/pin-request.json"

node - "$OUT_DIR/pin-request.json" "$OUT_DIR/request.env" "$REVIEWER_NODE_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const requestFile = process.argv[2];
const envFile = process.argv[3];
const reviewerNodeLabel = process.argv[4];

const req = JSON.parse(fs.readFileSync(requestFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };

const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeId = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);

if (!safeId(reviewerNodeLabel)) fail("reviewer_node_label_safe=false");

if (req.marker !== "VOID_DATANET_CORE_PEER_PIN_REQUEST_V1") fail("pin_review_request_marker_valid=false");
if (req.ok !== true) fail("pin_review_request_ok=false");
if (!isSha(req.request_id)) fail("pin_review_request_id_valid=false");

const copy = JSON.parse(JSON.stringify(req));
delete copy.request_id;
delete copy.request_id_scope;
const recomputed = crypto.createHash("sha256").update(JSON.stringify(copy, null, 2) + "\n").digest("hex");

if (recomputed !== req.request_id) fail("pin_review_request_id_hash_verified=false");

if (req.requested_action !== "operator_review_pin_or_mirror_dataset") fail("pin_review_requested_action_valid=false");
if (req.request_lane !== "out_of_band_operator_review_only") fail("pin_review_request_lane_valid=false");
if (req.operator_review_required !== true) fail("pin_review_operator_review_required=false");
if (req.automatic_mirror_requested !== false) fail("pin_review_automatic_mirror_requested_not_false");
if (req.automatic_pin_requested !== false) fail("pin_review_automatic_pin_requested_not_false");

if (!(req.selected_type === "operator_published" || req.selected_type === "mirrored")) fail("pin_review_selected_type_valid=false");
if (!safeId(req.dataset_id)) fail("pin_review_dataset_id_safe=false");
if (req.selected_type === "mirrored" && !safeId(req.mirror_node_label)) fail("pin_review_mirror_node_label_safe=false");

if (!isSha(req.manifest_sha256)) fail("pin_review_manifest_sha256_valid=false");
if (!isSha(req.content_root_sha256)) fail("pin_review_content_root_sha256_valid=false");
if (Number(req.object_count) <= 0) fail("pin_review_object_count_valid=false");
if (Number(req.total_bytes) < 0) fail("pin_review_total_bytes_valid=false");

const ev = req.evidence || {};
if (ev.peer_availability_index_fetched !== true) fail("pin_review_evidence_index_fetched=false");
if (ev.selected_from_peer_availability_index !== true) fail("pin_review_evidence_selected_from_index=false");
if (ev.peer_advertised_can_serve !== true) fail("pin_review_evidence_peer_can_serve=false");
if (ev.peer_content_verification_recommended_before_operator_approval !== true) fail("pin_review_evidence_verify_recommended=false");

const safety = req.public_safety || {};
if (safety.public_safe_request_packet !== true) fail("pin_review_public_safe_request_packet=false");
if (safety.public_post_upload !== false) fail("pin_review_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("pin_review_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("pin_review_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("pin_review_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("pin_review_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("pin_review_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_review_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("pin_review_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("pin_review_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("pin_review_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("pin_review_local_storage_root_disclosed_not_false");

const selectMode = req.selected_type === "mirrored" ? "mirrored" : "published";

const lines = [
  "REQUEST_ID=" + req.request_id,
  "SELECT_MODE=" + selectMode,
  "SELECTED_TYPE=" + req.selected_type,
  "DATASET_ID=" + req.dataset_id,
  "MIRROR_NODE_LABEL=" + (req.mirror_node_label || ""),
  "MANIFEST_SHA256=" + req.manifest_sha256,
  "CONTENT_ROOT_SHA256=" + req.content_root_sha256,
  "OBJECT_COUNT=" + req.object_count,
  "TOTAL_BYTES=" + req.total_bytes
];

fs.writeFileSync(envFile, lines.join("\n") + "\n");

console.log("pin_review_request_marker_valid=true");
console.log("pin_review_request_id_hash_verified=true");
console.log("pin_review_operator_review_required=true");
console.log("pin_review_automatic_mirror_requested=false");
console.log("pin_review_automatic_pin_requested=false");
console.log("pin_review_request_public_mutation=false");
console.log("pin_review_request_ledger_write=false");
console.log("pin_review_request_wc_credit_award=false");
NODE

cat "$OUT_DIR/request.env"
. "$OUT_DIR/request.env"

VERIFY_OUT="$OUT_DIR/peer-select-verify"

if [ "$SELECT_MODE" = "mirrored" ]; then
  OUT_DIR="$VERIFY_OUT" \
  PEER_BASE="$SOURCE_PEER_BASE" \
  SELECT_MODE=mirrored \
  DATASET_ID="$DATASET_ID" \
  MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
    ops/mainnet0/datanet-core-peer-select-verify-v1.sh > "$OUT_DIR/peer-select-verify.log"
else
  OUT_DIR="$VERIFY_OUT" \
  PEER_BASE="$SOURCE_PEER_BASE" \
  SELECT_MODE=published \
  DATASET_ID="$DATASET_ID" \
    ops/mainnet0/datanet-core-peer-select-verify-v1.sh > "$OUT_DIR/peer-select-verify.log"
fi

cat "$OUT_DIR/peer-select-verify.log"

grep -Fq 'VOID_DATANET_CORE_PEER_SELECT_VERIFY_V1_GREEN' "$OUT_DIR/peer-select-verify.log"
grep -Fq 'selected_object_sha256_verified=true' "$OUT_DIR/peer-select-verify.log"
grep -Fq 'selected_object_bytes_verified=true' "$OUT_DIR/peer-select-verify.log"
grep -Fq 'peer_select_verify_private_leak_scan_green=true' "$OUT_DIR/peer-select-verify.log"
grep -Fq 'peer_select_verify_public_mutation=false' "$OUT_DIR/peer-select-verify.log"
grep -Fq 'peer_select_verify_ledger_write=false' "$OUT_DIR/peer-select-verify.log"
grep -Fq 'peer_select_verify_wc_credit_award=false' "$OUT_DIR/peer-select-verify.log"

node - "$VERIFY_OUT/peer-select-verify-receipt.json" "$OUT_DIR/verified.env" "$SELECTED_TYPE" "$DATASET_ID" "$MIRROR_NODE_LABEL" "$MANIFEST_SHA256" "$CONTENT_ROOT_SHA256" <<'NODE'
const fs = require("node:fs");

const receiptFile = process.argv[2];
const envFile = process.argv[3];
const expectedSelectedType = process.argv[4];
const expectedDatasetId = process.argv[5];
const expectedMirrorNode = process.argv[6] || "";
const expectedManifestSha = process.argv[7];
const expectedContentRoot = process.argv[8];

const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (receipt.marker !== "VOID_DATANET_CORE_PEER_SELECT_VERIFY_RECEIPT_V1") fail("pin_review_peer_verify_receipt_marker_valid=false");
if (receipt.ok !== true) fail("pin_review_peer_verify_receipt_ok=false");
if (receipt.selected_type !== expectedSelectedType) fail("pin_review_selected_type_matches_request=false");
if (receipt.dataset_id !== expectedDatasetId) fail("pin_review_dataset_matches_request=false");
if (expectedSelectedType === "mirrored" && receipt.mirror_node_label !== expectedMirrorNode) fail("pin_review_mirror_node_matches_request=false");

const adv = receipt.advertised || {};
if (adv.manifest_sha256 !== expectedManifestSha) fail("pin_review_manifest_sha_matches_request=false");
if (adv.content_root_sha256 !== expectedContentRoot) fail("pin_review_content_root_matches_request=false");

const verification = receipt.verification || {};
if (verification.peer_availability_index_fetched !== true) fail("pin_review_verify_index_fetched=false");
if (verification.advertised_entry_selected !== true) fail("pin_review_verify_advertised_entry_selected=false");
if (verification.manifest_or_receipt_fetched !== true) fail("pin_review_verify_manifest_or_receipt_fetched=false");
if (verification.object_fetched !== true) fail("pin_review_verify_object_fetched=false");
if (verification.selected_object_sha256_verified !== true) fail("pin_review_verify_object_sha=false");
if (verification.selected_object_bytes_verified !== true) fail("pin_review_verify_object_bytes=false");

const safety = receipt.public_safety || {};
if (safety.receipt_public_safe !== true) fail("pin_review_verify_receipt_public_safe=false");
if (safety.public_mutation !== false) fail("pin_review_verify_public_mutation_not_false");
if (safety.ledger_write !== false) fail("pin_review_verify_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_review_verify_wc_credit_award_not_false");

const receiptHash = receipt.peer_select_verify_receipt && receipt.peer_select_verify_receipt.receipt_sha256;
if (!isSha(receiptHash)) fail("pin_review_peer_select_receipt_sha_valid=false");

fs.writeFileSync(envFile, [
  "PEER_SELECT_VERIFY_RECEIPT_SHA256=" + receiptHash,
  "VERIFIED_OBJECT_SHA256=" + verification.selected_object_sha256,
  "VERIFIED_OBJECT_BYTES=" + verification.selected_object_bytes
].join("\n") + "\n");

console.log("pin_review_peer_verify_receipt_marker_valid=true");
console.log("pin_review_peer_content_verified=true");
console.log("pin_review_manifest_matches_request=true");
console.log("pin_review_content_root_matches_request=true");
console.log("pin_review_peer_select_receipt_sha_valid=true");
console.log("pin_review_verify_public_mutation=false");
console.log("pin_review_verify_ledger_write=false");
console.log("pin_review_verify_wc_credit_award=false");
NODE

cat "$OUT_DIR/verified.env"
. "$OUT_DIR/verified.env"

node - "$OUT_DIR/pin-request.json" "$OUT_DIR/pin-review.nohash.json" "$REVIEWER_NODE_LABEL" "$PEER_SELECT_VERIFY_RECEIPT_SHA256" "$VERIFIED_OBJECT_SHA256" "$VERIFIED_OBJECT_BYTES" <<'NODE'
const fs = require("node:fs");

const requestFile = process.argv[2];
const outFile = process.argv[3];
const reviewerNodeLabel = process.argv[4];
const peerSelectVerifyReceiptSha = process.argv[5];
const verifiedObjectSha = process.argv[6];
const verifiedObjectBytes = Number(process.argv[7]);

const req = JSON.parse(fs.readFileSync(requestFile, "utf8"));

const review = {
  marker: "VOID_DATANET_CORE_PEER_PIN_REVIEW_V1",
  version: 1,
  ok: true,
  review_state: "operator_review_ready",
  review_decision: "not_approved_not_executed",
  reviewer_node_label: reviewerNodeLabel,
  request_id: req.request_id,
  request_marker: req.marker,
  requester_node_label: req.requester_node_label,
  target_node_label: req.target_node_label,
  selected_type: req.selected_type,
  dataset_id: req.dataset_id,
  mirror_node_label: req.selected_type === "mirrored" ? req.mirror_node_label : null,
  manifest_sha256: req.manifest_sha256,
  content_root_sha256: req.content_root_sha256,
  object_count: req.object_count,
  total_bytes: req.total_bytes,
  verification: {
    request_schema_valid: true,
    request_id_hash_verified: true,
    request_safety_flags_valid: true,
    peer_content_verified_before_operator_approval: true,
    peer_select_verify_receipt_sha256: peerSelectVerifyReceiptSha,
    verified_object_sha256: verifiedObjectSha,
    verified_object_bytes: verifiedObjectBytes
  },
  operator_gate: {
    operator_review_required: true,
    operator_approved_now: false,
    mirror_executed_now: false,
    pin_executed_now: false
  },
  public_safety: {
    review_packet_public_safe: true,
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

fs.writeFileSync(outFile, JSON.stringify(review, null, 2) + "\n");
NODE

REVIEW_ID="$(sha256sum "$OUT_DIR/pin-review.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/pin-review.nohash.json" "$OUT_DIR/pin-review.json" "$REVIEW_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const reviewId = process.argv[4];

const review = JSON.parse(fs.readFileSync(input, "utf8"));
review.review_id = reviewId;
review.review_id_scope = "sha256 over review packet without review_id fields";

fs.writeFileSync(output, JSON.stringify(review, null, 2) + "\n");
NODE

node - "$OUT_DIR/pin-review.json" <<'NODE'
const fs = require("node:fs");
const review = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (review.marker !== "VOID_DATANET_CORE_PEER_PIN_REVIEW_V1") fail("pin_review_marker_valid=false");
if (review.ok !== true) fail("pin_review_ok=false");
if (!isSha(review.review_id)) fail("pin_review_id_valid=false");
if (review.review_state !== "operator_review_ready") fail("pin_review_state_operator_review_ready=false");
if (review.review_decision !== "not_approved_not_executed") fail("pin_review_decision_not_executed=false");

const verification = review.verification || {};
if (verification.request_schema_valid !== true) fail("pin_review_request_schema_valid=false");
if (verification.request_id_hash_verified !== true) fail("pin_review_request_id_hash_verified=false");
if (verification.request_safety_flags_valid !== true) fail("pin_review_request_safety_flags_valid=false");
if (verification.peer_content_verified_before_operator_approval !== true) fail("pin_review_peer_content_verified=false");
if (!isSha(verification.peer_select_verify_receipt_sha256)) fail("pin_review_peer_select_verify_receipt_sha_valid=false");
if (!isSha(verification.verified_object_sha256)) fail("pin_review_verified_object_sha_valid=false");

const gate = review.operator_gate || {};
if (gate.operator_review_required !== true) fail("pin_review_operator_review_required=false");
if (gate.operator_approved_now !== false) fail("pin_review_operator_approved_now_not_false");
if (gate.mirror_executed_now !== false) fail("pin_review_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("pin_review_pin_executed_now_not_false");

const safety = review.public_safety || {};
if (safety.review_packet_public_safe !== true) fail("pin_review_packet_public_safe=false");
if (safety.public_post_upload !== false) fail("pin_review_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("pin_review_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("pin_review_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("pin_review_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("pin_review_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("pin_review_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_review_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("pin_review_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("pin_review_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("pin_review_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("pin_review_local_storage_root_disclosed_not_false");

console.log("pin_review_marker_valid=true");
console.log("pin_review_id_valid=true");
console.log("pin_review_request_id_hash_verified=true");
console.log("pin_review_peer_content_verified_before_operator_approval=true");
console.log("pin_review_operator_review_required=true");
console.log("pin_review_operator_approved_now=false");
console.log("pin_review_mirror_executed_now=false");
console.log("pin_review_pin_executed_now=false");
console.log("pin_review_public_mutation=false");
console.log("pin_review_ledger_write=false");
console.log("pin_review_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/pin-review.json"; then
  echo "pin_review_private_leak_scan_green=false"
  exit 1
fi

echo "pin_review_packet_created=true"
echo "pin_review_packet_path=$OUT_DIR/pin-review.json"
echo "pin_review_id=$REVIEW_ID"
echo "pin_review_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN"
