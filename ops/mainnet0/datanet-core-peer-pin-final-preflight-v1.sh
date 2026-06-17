#!/usr/bin/env bash
set -euo pipefail

PIN_DRY_RUN_PLAN_FILE="${PIN_DRY_RUN_PLAN_FILE:-}"
SOURCE_PEER_BASE="${SOURCE_PEER_BASE:-${PEER_BASE:-${BASE:-http://127.0.0.1:4100}}}"
LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
PREFLIGHT_OPERATOR_LABEL="${PREFLIGHT_OPERATOR_LABEL:-void-preflight-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-final-preflight-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$PIN_DRY_RUN_PLAN_FILE" ]; then
  echo "pin_dry_run_plan_file_required=false"
  exit 1
fi

if [ ! -f "$PIN_DRY_RUN_PLAN_FILE" ]; then
  echo "pin_dry_run_plan_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1"
echo "source_peer_base=$SOURCE_PEER_BASE"
echo "local_base=$LOCAL_BASE"
echo "preflight_operator_label=$PREFLIGHT_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

cp "$PIN_DRY_RUN_PLAN_FILE" "$OUT_DIR/dry-run-plan.json"

node - "$OUT_DIR/dry-run-plan.json" "$OUT_DIR/plan.env" "$PREFLIGHT_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const planFile = process.argv[2];
const envFile = process.argv[3];
const preflightOperatorLabel = process.argv[4];

const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeId = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);

if (!safeId(preflightOperatorLabel)) fail("pin_final_preflight_operator_label_safe=false");

if (plan.marker !== "VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1") fail("pin_final_preflight_dry_run_plan_marker_valid=false");
if (plan.ok !== true) fail("pin_final_preflight_dry_run_plan_ok=false");
if (!isSha(plan.plan_id)) fail("pin_final_preflight_plan_id_valid=false");

const copy = JSON.parse(JSON.stringify(plan));
delete copy.plan_id;
delete copy.plan_id_scope;
const recomputed = crypto.createHash("sha256").update(JSON.stringify(copy, null, 2) + "\n").digest("hex");

if (recomputed !== plan.plan_id) fail("pin_final_preflight_plan_id_hash_verified=false");

if (plan.plan_state !== "dry_run_only") fail("pin_final_preflight_plan_state_dry_run_only=false");
if (plan.execution_decision !== "not_approved_not_executed") fail("pin_final_preflight_execution_decision_not_executed=false");
if (!(plan.selected_type === "operator_published" || plan.selected_type === "mirrored")) fail("pin_final_preflight_selected_type_valid=false");
if (!safeId(plan.dataset_id)) fail("pin_final_preflight_dataset_id_safe=false");
if (plan.selected_type === "mirrored" && !safeId(plan.mirror_node_label)) fail("pin_final_preflight_mirror_node_label_safe=false");

if (!isSha(plan.review_id)) fail("pin_final_preflight_review_id_valid=false");
if (!isSha(plan.request_id)) fail("pin_final_preflight_request_id_valid=false");
if (!isSha(plan.manifest_sha256)) fail("pin_final_preflight_manifest_sha256_valid=false");
if (!isSha(plan.content_root_sha256)) fail("pin_final_preflight_content_root_sha256_valid=false");
if (Number(plan.object_count) <= 0) fail("pin_final_preflight_object_count_valid=false");
if (Number(plan.total_bytes) < 0) fail("pin_final_preflight_total_bytes_valid=false");

const reviewed = plan.reviewed_packet || {};
if (reviewed.review_packet_valid !== true) fail("pin_final_preflight_review_packet_valid=false");
if (reviewed.review_id_hash_verified !== true) fail("pin_final_preflight_review_id_hash_verified=false");
if (reviewed.request_id_hash_verified !== true) fail("pin_final_preflight_request_id_hash_verified=false");
if (reviewed.peer_content_verified_before_operator_approval !== true) fail("pin_final_preflight_peer_content_verified_before_operator_approval=false");

const required = plan.required_before_execution || {};
if (required.explicit_operator_approval_required !== true) fail("pin_final_preflight_operator_approval_required=false");
if (required.duplicate_local_availability_check_required !== true) fail("pin_final_preflight_duplicate_check_required=false");
if (required.pre_execution_backup_required !== true) fail("pin_final_preflight_backup_required=false");
if (required.source_peer_reachability_check_required !== true) fail("pin_final_preflight_source_reachability_required=false");
if (required.final_peer_content_verify_required !== true) fail("pin_final_preflight_final_verify_required=false");
if (required.operator_terminal_execute_required !== true) fail("pin_final_preflight_operator_terminal_execute_required=false");

const proposed = plan.proposed_execution_plan || {};
if (proposed.dry_run_only !== true) fail("pin_final_preflight_proposed_dry_run_only=false");
if (proposed.command_rendered_now !== false) fail("pin_final_preflight_command_rendered_now_not_false");
if (proposed.command_executed_now !== false) fail("pin_final_preflight_command_executed_now_not_false");
if (proposed.local_storage_path_disclosed !== false) fail("pin_final_preflight_local_storage_path_disclosed_not_false");

const gate = plan.operator_gate || {};
if (gate.operator_review_required !== true) fail("pin_final_preflight_operator_review_required=false");
if (gate.operator_approved_now !== false) fail("pin_final_preflight_operator_approved_now_not_false");
if (gate.execution_allowed_now !== false) fail("pin_final_preflight_execution_allowed_now_not_false");
if (gate.mirror_executed_now !== false) fail("pin_final_preflight_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("pin_final_preflight_pin_executed_now_not_false");

const safety = plan.public_safety || {};
if (safety.dry_run_packet_public_safe !== true) fail("pin_final_preflight_dry_run_packet_public_safe=false");
if (safety.public_mutation !== false) fail("pin_final_preflight_plan_public_mutation_not_false");
if (safety.ledger_write !== false) fail("pin_final_preflight_plan_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_final_preflight_plan_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("pin_final_preflight_plan_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("pin_final_preflight_plan_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("pin_final_preflight_plan_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("pin_final_preflight_plan_local_storage_root_disclosed_not_false");

const selectMode = plan.selected_type === "mirrored" ? "mirrored" : "published";

fs.writeFileSync(envFile, [
  "PLAN_ID=" + plan.plan_id,
  "REVIEW_ID=" + plan.review_id,
  "REQUEST_ID=" + plan.request_id,
  "SELECT_MODE=" + selectMode,
  "SELECTED_TYPE=" + plan.selected_type,
  "DATASET_ID=" + plan.dataset_id,
  "MIRROR_NODE_LABEL=" + (plan.mirror_node_label || ""),
  "MANIFEST_SHA256=" + plan.manifest_sha256,
  "CONTENT_ROOT_SHA256=" + plan.content_root_sha256,
  "OBJECT_COUNT=" + plan.object_count,
  "TOTAL_BYTES=" + plan.total_bytes
].join("\n") + "\n");

console.log("pin_final_preflight_dry_run_plan_marker_valid=true");
console.log("pin_final_preflight_plan_id_hash_verified=true");
console.log("pin_final_preflight_review_packet_valid=true");
console.log("pin_final_preflight_review_id_hash_verified=true");
console.log("pin_final_preflight_request_id_hash_verified=true");
console.log("pin_final_preflight_peer_content_verified_before_operator_approval=true");
console.log("pin_final_preflight_operator_approved_now=false");
console.log("pin_final_preflight_execution_allowed_now=false");
console.log("pin_final_preflight_mirror_executed_now=false");
console.log("pin_final_preflight_pin_executed_now=false");
console.log("pin_final_preflight_plan_public_mutation=false");
console.log("pin_final_preflight_plan_ledger_write=false");
console.log("pin_final_preflight_plan_wc_credit_award=false");
NODE

cat "$OUT_DIR/plan.env"
. "$OUT_DIR/plan.env"

echo
echo "=== source peer reachability check ==="
curl -fsS "$SOURCE_PEER_BASE/public-node/datanet/core-peer-availability-index-v1.json" > "$OUT_DIR/source-peer-availability-index.json"
echo "pin_final_preflight_source_peer_reachable=true"

echo
echo "=== duplicate local availability check ==="
curl -fsS "$LOCAL_BASE/public-node/datanet/core-peer-availability-index-v1.json" > "$OUT_DIR/local-availability-index.json"

node - "$OUT_DIR/local-availability-index.json" "$OUT_DIR/duplicate.env" "$DATASET_ID" "$MANIFEST_SHA256" "$CONTENT_ROOT_SHA256" <<'NODE'
const fs = require("node:fs");

const indexFile = process.argv[2];
const envFile = process.argv[3];
const datasetId = process.argv[4];
const manifestSha = process.argv[5];
const contentRoot = process.argv[6];

const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };

if (index.marker !== "VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_V1") fail("pin_final_preflight_local_index_marker_valid=false");
if (index.ok !== true) fail("pin_final_preflight_local_index_ok=false");

const safety = index.public_safety || {};
if (safety.public_mutation !== false) fail("pin_final_preflight_local_index_public_mutation_not_false");
if (safety.ledger_write !== false) fail("pin_final_preflight_local_index_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_final_preflight_local_index_wc_credit_award_not_false");

const published = Array.isArray(index.operator_published) ? index.operator_published : [];
const mirrored = Array.isArray(index.mirrored) ? index.mirrored : [];

const matches = [];

for (const entry of published) {
  if (entry.dataset_id === datasetId && entry.manifest_sha256 === manifestSha && entry.content_root_sha256 === contentRoot) {
    matches.push("operator_published");
  }
}

for (const entry of mirrored) {
  if (entry.dataset_id === datasetId && entry.manifest_sha256 === manifestSha && entry.content_root_sha256 === contentRoot) {
    matches.push("mirrored");
  }
}

const duplicateFound = matches.length > 0;

fs.writeFileSync(envFile, [
  "DUPLICATE_FOUND=" + String(duplicateFound),
  "DUPLICATE_MATCH_COUNT=" + matches.length,
  "DUPLICATE_MATCH_TYPES=" + (matches.join(",") || "none")
].join("\n") + "\n");

console.log("pin_final_preflight_local_index_marker_valid=true");
console.log("pin_final_preflight_duplicate_local_availability_check_performed=true");
console.log("pin_final_preflight_duplicate_found=" + String(duplicateFound));
console.log("pin_final_preflight_duplicate_match_count=" + matches.length);
console.log("pin_final_preflight_local_index_public_mutation=false");
console.log("pin_final_preflight_local_index_ledger_write=false");
console.log("pin_final_preflight_local_index_wc_credit_award=false");
NODE

cat "$OUT_DIR/duplicate.env"
. "$OUT_DIR/duplicate.env"

echo
echo "=== final peer content verify ==="
VERIFY_OUT="$OUT_DIR/final-peer-select-verify"

if [ "$SELECT_MODE" = "mirrored" ]; then
  OUT_DIR="$VERIFY_OUT" \
  PEER_BASE="$SOURCE_PEER_BASE" \
  SELECT_MODE=mirrored \
  DATASET_ID="$DATASET_ID" \
  MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
    ops/mainnet0/datanet-core-peer-select-verify-v1.sh > "$OUT_DIR/final-peer-select-verify.log"
else
  OUT_DIR="$VERIFY_OUT" \
  PEER_BASE="$SOURCE_PEER_BASE" \
  SELECT_MODE=published \
  DATASET_ID="$DATASET_ID" \
    ops/mainnet0/datanet-core-peer-select-verify-v1.sh > "$OUT_DIR/final-peer-select-verify.log"
fi

cat "$OUT_DIR/final-peer-select-verify.log"

grep -Fq 'VOID_DATANET_CORE_PEER_SELECT_VERIFY_V1_GREEN' "$OUT_DIR/final-peer-select-verify.log"
grep -Fq 'selected_object_sha256_verified=true' "$OUT_DIR/final-peer-select-verify.log"
grep -Fq 'selected_object_bytes_verified=true' "$OUT_DIR/final-peer-select-verify.log"
grep -Fq 'peer_select_verify_private_leak_scan_green=true' "$OUT_DIR/final-peer-select-verify.log"
grep -Fq 'peer_select_verify_public_mutation=false' "$OUT_DIR/final-peer-select-verify.log"
grep -Fq 'peer_select_verify_ledger_write=false' "$OUT_DIR/final-peer-select-verify.log"
grep -Fq 'peer_select_verify_wc_credit_award=false' "$OUT_DIR/final-peer-select-verify.log"

node - "$VERIFY_OUT/peer-select-verify-receipt.json" "$OUT_DIR/final-verify.env" "$SELECTED_TYPE" "$DATASET_ID" "$MIRROR_NODE_LABEL" "$MANIFEST_SHA256" "$CONTENT_ROOT_SHA256" <<'NODE'
const fs = require("node:fs");

const receiptFile = process.argv[2];
const envFile = process.argv[3];
const expectedType = process.argv[4];
const expectedDataset = process.argv[5];
const expectedMirror = process.argv[6] || "";
const expectedManifest = process.argv[7];
const expectedContentRoot = process.argv[8];

const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (receipt.marker !== "VOID_DATANET_CORE_PEER_SELECT_VERIFY_RECEIPT_V1") fail("pin_final_preflight_verify_receipt_marker_valid=false");
if (receipt.ok !== true) fail("pin_final_preflight_verify_receipt_ok=false");
if (receipt.selected_type !== expectedType) fail("pin_final_preflight_verify_selected_type_matches_plan=false");
if (receipt.dataset_id !== expectedDataset) fail("pin_final_preflight_verify_dataset_matches_plan=false");
if (expectedType === "mirrored" && receipt.mirror_node_label !== expectedMirror) fail("pin_final_preflight_verify_mirror_matches_plan=false");

const adv = receipt.advertised || {};
if (adv.manifest_sha256 !== expectedManifest) fail("pin_final_preflight_verify_manifest_matches_plan=false");
if (adv.content_root_sha256 !== expectedContentRoot) fail("pin_final_preflight_verify_content_root_matches_plan=false");

const verification = receipt.verification || {};
if (verification.selected_object_sha256_verified !== true) fail("pin_final_preflight_verify_object_sha=false");
if (verification.selected_object_bytes_verified !== true) fail("pin_final_preflight_verify_object_bytes=false");

const safety = receipt.public_safety || {};
if (safety.public_mutation !== false) fail("pin_final_preflight_verify_public_mutation_not_false");
if (safety.ledger_write !== false) fail("pin_final_preflight_verify_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_final_preflight_verify_wc_credit_award_not_false");

const receiptHash = receipt.peer_select_verify_receipt && receipt.peer_select_verify_receipt.receipt_sha256;
if (!isSha(receiptHash)) fail("pin_final_preflight_verify_receipt_sha_valid=false");

fs.writeFileSync(envFile, [
  "FINAL_PEER_SELECT_VERIFY_RECEIPT_SHA256=" + receiptHash,
  "FINAL_VERIFIED_OBJECT_SHA256=" + verification.selected_object_sha256,
  "FINAL_VERIFIED_OBJECT_BYTES=" + verification.selected_object_bytes
].join("\n") + "\n");

console.log("pin_final_preflight_final_peer_content_verify_green=true");
console.log("pin_final_preflight_verify_manifest_matches_plan=true");
console.log("pin_final_preflight_verify_content_root_matches_plan=true");
console.log("pin_final_preflight_verify_receipt_sha_valid=true");
console.log("pin_final_preflight_verify_public_mutation=false");
console.log("pin_final_preflight_verify_ledger_write=false");
console.log("pin_final_preflight_verify_wc_credit_award=false");
NODE

cat "$OUT_DIR/final-verify.env"
. "$OUT_DIR/final-verify.env"

node - "$OUT_DIR/final-preflight.nohash.json" \
  "$PREFLIGHT_OPERATOR_LABEL" \
  "$PLAN_ID" \
  "$REVIEW_ID" \
  "$REQUEST_ID" \
  "$SELECTED_TYPE" \
  "$DATASET_ID" \
  "$MIRROR_NODE_LABEL" \
  "$MANIFEST_SHA256" \
  "$CONTENT_ROOT_SHA256" \
  "$OBJECT_COUNT" \
  "$TOTAL_BYTES" \
  "$DUPLICATE_FOUND" \
  "$DUPLICATE_MATCH_COUNT" \
  "$DUPLICATE_MATCH_TYPES" \
  "$FINAL_PEER_SELECT_VERIFY_RECEIPT_SHA256" \
  "$FINAL_VERIFIED_OBJECT_SHA256" \
  "$FINAL_VERIFIED_OBJECT_BYTES" <<'NODE'
const fs = require("node:fs");

const [
  outFile,
  preflightOperatorLabel,
  planId,
  reviewId,
  requestId,
  selectedType,
  datasetId,
  mirrorNodeLabel,
  manifestSha,
  contentRootSha,
  objectCountRaw,
  totalBytesRaw,
  duplicateFoundRaw,
  duplicateMatchCountRaw,
  duplicateMatchTypes,
  finalReceiptSha,
  finalObjectSha,
  finalObjectBytesRaw
] = process.argv.slice(2);

const preflight = {
  marker: "VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1",
  version: 1,
  ok: true,
  preflight_state: "final_preflight_ready_not_approved",
  execution_decision: "not_approved_not_executed",
  preflight_operator_label: preflightOperatorLabel,
  plan_id: planId,
  review_id: reviewId,
  request_id: requestId,
  selected_type: selectedType,
  dataset_id: datasetId,
  mirror_node_label: selectedType === "mirrored" ? mirrorNodeLabel : null,
  manifest_sha256: manifestSha,
  content_root_sha256: contentRootSha,
  object_count: Number(objectCountRaw),
  total_bytes: Number(totalBytesRaw),
  dry_run_plan_validation: {
    dry_run_plan_valid: true,
    plan_id_hash_verified: true,
    review_packet_valid: true,
    review_id_hash_verified: true,
    request_id_hash_verified: true,
    dry_run_only: true
  },
  local_duplicate_check: {
    duplicate_local_availability_check_performed: true,
    duplicate_found: duplicateFoundRaw === "true",
    duplicate_match_count: Number(duplicateMatchCountRaw),
    duplicate_match_types: duplicateMatchTypes
  },
  final_peer_verify: {
    source_peer_reachable: true,
    final_peer_content_verify_green: true,
    peer_select_verify_receipt_sha256: finalReceiptSha,
    verified_object_sha256: finalObjectSha,
    verified_object_bytes: Number(finalObjectBytesRaw)
  },
  required_before_execution: {
    explicit_operator_approval_required: true,
    pre_execution_backup_required: true,
    backup_created_now: false,
    operator_terminal_execute_required: true,
    final_command_review_required: true
  },
  operator_gate: {
    operator_review_required: true,
    operator_approved_now: false,
    execution_allowed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false
  },
  public_safety: {
    final_preflight_packet_public_safe: true,
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

fs.writeFileSync(outFile, JSON.stringify(preflight, null, 2) + "\n");
NODE

PREFLIGHT_ID="$(sha256sum "$OUT_DIR/final-preflight.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/final-preflight.nohash.json" "$OUT_DIR/final-preflight.json" "$PREFLIGHT_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const preflightId = process.argv[4];

const preflight = JSON.parse(fs.readFileSync(input, "utf8"));
preflight.preflight_id = preflightId;
preflight.preflight_id_scope = "sha256 over final preflight packet without preflight_id fields";

fs.writeFileSync(output, JSON.stringify(preflight, null, 2) + "\n");
NODE

node - "$OUT_DIR/final-preflight.json" <<'NODE'
const fs = require("node:fs");
const preflight = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (preflight.marker !== "VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1") fail("pin_final_preflight_marker_valid=false");
if (preflight.ok !== true) fail("pin_final_preflight_ok=false");
if (!isSha(preflight.preflight_id)) fail("pin_final_preflight_id_valid=false");
if (preflight.preflight_state !== "final_preflight_ready_not_approved") fail("pin_final_preflight_state_valid=false");
if (preflight.execution_decision !== "not_approved_not_executed") fail("pin_final_preflight_execution_decision_valid=false");

const plan = preflight.dry_run_plan_validation || {};
if (plan.dry_run_plan_valid !== true) fail("pin_final_preflight_dry_run_plan_valid=false");
if (plan.plan_id_hash_verified !== true) fail("pin_final_preflight_plan_id_hash_verified=false");
if (plan.review_packet_valid !== true) fail("pin_final_preflight_review_packet_valid=false");
if (plan.review_id_hash_verified !== true) fail("pin_final_preflight_review_id_hash_verified=false");
if (plan.request_id_hash_verified !== true) fail("pin_final_preflight_request_id_hash_verified=false");
if (plan.dry_run_only !== true) fail("pin_final_preflight_dry_run_only=false");

const dup = preflight.local_duplicate_check || {};
if (dup.duplicate_local_availability_check_performed !== true) fail("pin_final_preflight_duplicate_check_performed=false");

const verify = preflight.final_peer_verify || {};
if (verify.source_peer_reachable !== true) fail("pin_final_preflight_source_peer_reachable=false");
if (verify.final_peer_content_verify_green !== true) fail("pin_final_preflight_final_verify_green=false");
if (!isSha(verify.peer_select_verify_receipt_sha256)) fail("pin_final_preflight_peer_select_verify_receipt_sha_valid=false");
if (!isSha(verify.verified_object_sha256)) fail("pin_final_preflight_verified_object_sha_valid=false");

const required = preflight.required_before_execution || {};
if (required.explicit_operator_approval_required !== true) fail("pin_final_preflight_explicit_operator_approval_required=false");
if (required.pre_execution_backup_required !== true) fail("pin_final_preflight_backup_required=false");
if (required.backup_created_now !== false) fail("pin_final_preflight_backup_created_now_not_false");
if (required.operator_terminal_execute_required !== true) fail("pin_final_preflight_operator_terminal_execute_required=false");
if (required.final_command_review_required !== true) fail("pin_final_preflight_final_command_review_required=false");

const gate = preflight.operator_gate || {};
if (gate.operator_review_required !== true) fail("pin_final_preflight_operator_review_required=false");
if (gate.operator_approved_now !== false) fail("pin_final_preflight_operator_approved_now_not_false");
if (gate.execution_allowed_now !== false) fail("pin_final_preflight_execution_allowed_now_not_false");
if (gate.mirror_executed_now !== false) fail("pin_final_preflight_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("pin_final_preflight_pin_executed_now_not_false");

const safety = preflight.public_safety || {};
if (safety.final_preflight_packet_public_safe !== true) fail("pin_final_preflight_packet_public_safe=false");
if (safety.public_post_upload !== false) fail("pin_final_preflight_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("pin_final_preflight_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("pin_final_preflight_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("pin_final_preflight_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("pin_final_preflight_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("pin_final_preflight_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_final_preflight_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("pin_final_preflight_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("pin_final_preflight_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("pin_final_preflight_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("pin_final_preflight_local_storage_root_disclosed_not_false");

console.log("pin_final_preflight_marker_valid=true");
console.log("pin_final_preflight_id_valid=true");
console.log("pin_final_preflight_dry_run_plan_valid=true");
console.log("pin_final_preflight_plan_id_hash_verified=true");
console.log("pin_final_preflight_duplicate_local_availability_check_performed=true");
console.log("pin_final_preflight_duplicate_found=" + String(dup.duplicate_found));
console.log("pin_final_preflight_source_peer_reachable=true");
console.log("pin_final_preflight_final_peer_content_verify_green=true");
console.log("pin_final_preflight_backup_required=true");
console.log("pin_final_preflight_backup_created_now=false");
console.log("pin_final_preflight_operator_approved_now=false");
console.log("pin_final_preflight_execution_allowed_now=false");
console.log("pin_final_preflight_mirror_executed_now=false");
console.log("pin_final_preflight_pin_executed_now=false");
console.log("pin_final_preflight_public_mutation=false");
console.log("pin_final_preflight_ledger_write=false");
console.log("pin_final_preflight_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/final-preflight.json"; then
  echo "pin_final_preflight_private_leak_scan_green=false"
  exit 1
fi

echo "pin_final_preflight_packet_created=true"
echo "pin_final_preflight_packet_path=$OUT_DIR/final-preflight.json"
echo "pin_final_preflight_id=$PREFLIGHT_ID"
echo "pin_final_preflight_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1_GREEN"
