#!/usr/bin/env bash
set -euo pipefail

PIN_REVIEW_FILE="${PIN_REVIEW_FILE:-}"
DRY_RUN_OPERATOR_LABEL="${DRY_RUN_OPERATOR_LABEL:-void-dry-run-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-execute-dry-run-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$PIN_REVIEW_FILE" ]; then
  echo "pin_review_file_required=false"
  exit 1
fi

if [ ! -f "$PIN_REVIEW_FILE" ]; then
  echo "pin_review_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1"
echo "dry_run_operator_label=$DRY_RUN_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

cp "$PIN_REVIEW_FILE" "$OUT_DIR/pin-review.json"

node - "$OUT_DIR/pin-review.json" "$OUT_DIR/dry-run.nohash.json" "$DRY_RUN_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const reviewFile = process.argv[2];
const outFile = process.argv[3];
const dryRunOperatorLabel = process.argv[4];

const review = JSON.parse(fs.readFileSync(reviewFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeId = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);

if (!safeId(dryRunOperatorLabel)) fail("dry_run_operator_label_safe=false");

if (review.marker !== "VOID_DATANET_CORE_PEER_PIN_REVIEW_V1") fail("pin_execute_dry_run_review_marker_valid=false");
if (review.ok !== true) fail("pin_execute_dry_run_review_ok=false");
if (!isSha(review.review_id)) fail("pin_execute_dry_run_review_id_valid=false");

const reviewCopy = JSON.parse(JSON.stringify(review));
delete reviewCopy.review_id;
delete reviewCopy.review_id_scope;
const recomputedReviewId = crypto.createHash("sha256").update(JSON.stringify(reviewCopy, null, 2) + "\n").digest("hex");

if (recomputedReviewId !== review.review_id) fail("pin_execute_dry_run_review_id_hash_verified=false");

if (review.review_state !== "operator_review_ready") fail("pin_execute_dry_run_review_state_ready=false");
if (review.review_decision !== "not_approved_not_executed") fail("pin_execute_dry_run_review_decision_not_executed=false");
if (!(review.selected_type === "operator_published" || review.selected_type === "mirrored")) fail("pin_execute_dry_run_selected_type_valid=false");
if (!safeId(review.dataset_id)) fail("pin_execute_dry_run_dataset_id_safe=false");
if (review.selected_type === "mirrored" && !safeId(review.mirror_node_label)) fail("pin_execute_dry_run_mirror_node_label_safe=false");

if (!isSha(review.request_id)) fail("pin_execute_dry_run_request_id_valid=false");
if (!isSha(review.manifest_sha256)) fail("pin_execute_dry_run_manifest_sha256_valid=false");
if (!isSha(review.content_root_sha256)) fail("pin_execute_dry_run_content_root_sha256_valid=false");
if (Number(review.object_count) <= 0) fail("pin_execute_dry_run_object_count_valid=false");
if (Number(review.total_bytes) < 0) fail("pin_execute_dry_run_total_bytes_valid=false");

const verification = review.verification || {};
if (verification.request_schema_valid !== true) fail("pin_execute_dry_run_request_schema_valid=false");
if (verification.request_id_hash_verified !== true) fail("pin_execute_dry_run_request_id_hash_verified=false");
if (verification.request_safety_flags_valid !== true) fail("pin_execute_dry_run_request_safety_flags_valid=false");
if (verification.peer_content_verified_before_operator_approval !== true) fail("pin_execute_dry_run_peer_content_verified=false");
if (!isSha(verification.peer_select_verify_receipt_sha256)) fail("pin_execute_dry_run_peer_select_verify_receipt_sha_valid=false");
if (!isSha(verification.verified_object_sha256)) fail("pin_execute_dry_run_verified_object_sha_valid=false");

const gate = review.operator_gate || {};
if (gate.operator_review_required !== true) fail("pin_execute_dry_run_operator_review_required=false");
if (gate.operator_approved_now !== false) fail("pin_execute_dry_run_operator_approved_now_not_false");
if (gate.mirror_executed_now !== false) fail("pin_execute_dry_run_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("pin_execute_dry_run_pin_executed_now_not_false");

const safety = review.public_safety || {};
if (safety.review_packet_public_safe !== true) fail("pin_execute_dry_run_review_packet_public_safe=false");
if (safety.public_mutation !== false) fail("pin_execute_dry_run_review_public_mutation_not_false");
if (safety.ledger_write !== false) fail("pin_execute_dry_run_review_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_execute_dry_run_review_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("pin_execute_dry_run_review_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("pin_execute_dry_run_review_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("pin_execute_dry_run_review_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("pin_execute_dry_run_review_local_storage_root_disclosed_not_false");

const proposedMirrorNodeLabel = ("pin-" + dryRunOperatorLabel + "-" + review.dataset_id)
  .replace(/[^a-zA-Z0-9._-]/g, "-")
  .slice(0, 96);

const plan = {
  marker: "VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1",
  version: 1,
  ok: true,
  plan_state: "dry_run_only",
  execution_decision: "not_approved_not_executed",
  dry_run_operator_label: dryRunOperatorLabel,
  review_id: review.review_id,
  request_id: review.request_id,
  selected_type: review.selected_type,
  dataset_id: review.dataset_id,
  mirror_node_label: review.selected_type === "mirrored" ? review.mirror_node_label : null,
  manifest_sha256: review.manifest_sha256,
  content_root_sha256: review.content_root_sha256,
  object_count: review.object_count,
  total_bytes: review.total_bytes,
  reviewed_packet: {
    review_packet_valid: true,
    review_id_hash_verified: true,
    request_id_hash_verified: true,
    peer_content_verified_before_operator_approval: true,
    peer_select_verify_receipt_sha256: verification.peer_select_verify_receipt_sha256
  },
  required_before_execution: {
    explicit_operator_approval_required: true,
    duplicate_local_availability_check_required: true,
    pre_execution_backup_required: true,
    source_peer_reachability_check_required: true,
    final_peer_content_verify_required: true,
    operator_terminal_execute_required: true
  },
  proposed_execution_plan: {
    command_family: "datanet-core-mirror-loop-v1.sh",
    source_peer_base_required_at_execution: true,
    dataset_id: review.dataset_id,
    proposed_mirror_node_label: proposedMirrorNodeLabel,
    dry_run_only: true,
    command_rendered_now: false,
    command_executed_now: false,
    local_storage_path_disclosed: false
  },
  operator_gate: {
    operator_review_required: true,
    operator_approved_now: false,
    execution_allowed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false
  },
  public_safety: {
    dry_run_packet_public_safe: true,
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

fs.writeFileSync(outFile, JSON.stringify(plan, null, 2) + "\n");

console.log("pin_execute_dry_run_review_packet_valid=true");
console.log("pin_execute_dry_run_review_id_hash_verified=true");
console.log("pin_execute_dry_run_request_id_hash_verified=true");
console.log("pin_execute_dry_run_peer_content_verified_before_operator_approval=true");
console.log("pin_execute_dry_run_operator_review_required=true");
console.log("pin_execute_dry_run_operator_approved_now=false");
console.log("pin_execute_dry_run_execution_allowed_now=false");
console.log("pin_execute_dry_run_mirror_executed_now=false");
console.log("pin_execute_dry_run_pin_executed_now=false");
console.log("pin_execute_dry_run_public_mutation=false");
console.log("pin_execute_dry_run_ledger_write=false");
console.log("pin_execute_dry_run_wc_credit_award=false");
NODE

PLAN_ID="$(sha256sum "$OUT_DIR/dry-run.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/dry-run.nohash.json" "$OUT_DIR/dry-run-plan.json" "$PLAN_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const planId = process.argv[4];

const plan = JSON.parse(fs.readFileSync(input, "utf8"));
plan.plan_id = planId;
plan.plan_id_scope = "sha256 over dry-run plan without plan_id fields";

fs.writeFileSync(output, JSON.stringify(plan, null, 2) + "\n");
NODE

node - "$OUT_DIR/dry-run-plan.json" <<'NODE'
const fs = require("node:fs");
const plan = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (plan.marker !== "VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1") fail("pin_execute_dry_run_marker_valid=false");
if (plan.ok !== true) fail("pin_execute_dry_run_ok=false");
if (!isSha(plan.plan_id)) fail("pin_execute_dry_run_plan_id_valid=false");
if (plan.plan_state !== "dry_run_only") fail("pin_execute_dry_run_plan_state_valid=false");
if (plan.execution_decision !== "not_approved_not_executed") fail("pin_execute_dry_run_execution_decision_valid=false");

const reviewed = plan.reviewed_packet || {};
if (reviewed.review_packet_valid !== true) fail("pin_execute_dry_run_review_packet_valid=false");
if (reviewed.review_id_hash_verified !== true) fail("pin_execute_dry_run_review_id_hash_verified=false");
if (reviewed.request_id_hash_verified !== true) fail("pin_execute_dry_run_request_id_hash_verified=false");
if (reviewed.peer_content_verified_before_operator_approval !== true) fail("pin_execute_dry_run_peer_content_verified=false");

const required = plan.required_before_execution || {};
if (required.explicit_operator_approval_required !== true) fail("pin_execute_dry_run_explicit_operator_approval_required=false");
if (required.duplicate_local_availability_check_required !== true) fail("pin_execute_dry_run_duplicate_check_required=false");
if (required.pre_execution_backup_required !== true) fail("pin_execute_dry_run_backup_required=false");
if (required.final_peer_content_verify_required !== true) fail("pin_execute_dry_run_final_verify_required=false");

const proposed = plan.proposed_execution_plan || {};
if (proposed.dry_run_only !== true) fail("pin_execute_dry_run_dry_run_only=false");
if (proposed.command_rendered_now !== false) fail("pin_execute_dry_run_command_rendered_now_not_false");
if (proposed.command_executed_now !== false) fail("pin_execute_dry_run_command_executed_now_not_false");
if (proposed.local_storage_path_disclosed !== false) fail("pin_execute_dry_run_local_storage_path_disclosed_not_false");

const gate = plan.operator_gate || {};
if (gate.operator_review_required !== true) fail("pin_execute_dry_run_operator_review_required=false");
if (gate.operator_approved_now !== false) fail("pin_execute_dry_run_operator_approved_now_not_false");
if (gate.execution_allowed_now !== false) fail("pin_execute_dry_run_execution_allowed_now_not_false");
if (gate.mirror_executed_now !== false) fail("pin_execute_dry_run_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("pin_execute_dry_run_pin_executed_now_not_false");

const safety = plan.public_safety || {};
if (safety.dry_run_packet_public_safe !== true) fail("pin_execute_dry_run_packet_public_safe=false");
if (safety.public_post_upload !== false) fail("pin_execute_dry_run_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("pin_execute_dry_run_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("pin_execute_dry_run_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("pin_execute_dry_run_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("pin_execute_dry_run_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("pin_execute_dry_run_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("pin_execute_dry_run_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("pin_execute_dry_run_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("pin_execute_dry_run_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("pin_execute_dry_run_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("pin_execute_dry_run_local_storage_root_disclosed_not_false");

console.log("pin_execute_dry_run_marker_valid=true");
console.log("pin_execute_dry_run_plan_id_valid=true");
console.log("pin_execute_dry_run_plan_created=true");
console.log("pin_execute_dry_run_dry_run_only=true");
console.log("pin_execute_dry_run_explicit_operator_approval_required=true");
console.log("pin_execute_dry_run_duplicate_check_required=true");
console.log("pin_execute_dry_run_backup_required=true");
console.log("pin_execute_dry_run_final_verify_required=true");
console.log("pin_execute_dry_run_command_rendered_now=false");
console.log("pin_execute_dry_run_command_executed_now=false");
console.log("pin_execute_dry_run_execution_allowed_now=false");
console.log("pin_execute_dry_run_public_mutation=false");
console.log("pin_execute_dry_run_ledger_write=false");
console.log("pin_execute_dry_run_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/dry-run-plan.json"; then
  echo "pin_execute_dry_run_private_leak_scan_green=false"
  exit 1
fi

echo "pin_execute_dry_run_plan_path=$OUT_DIR/dry-run-plan.json"
echo "pin_execute_dry_run_plan_id=$PLAN_ID"
echo "pin_execute_dry_run_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1_GREEN"
