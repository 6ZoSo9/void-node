#!/usr/bin/env bash
set -euo pipefail

FINAL_PREFLIGHT_FILE="${FINAL_PREFLIGHT_FILE:-}"
OPERATOR_APPROVAL_LABEL="${OPERATOR_APPROVAL_LABEL:-void-operator-approval-local}"
OPERATOR_APPROVAL_REASON="${OPERATOR_APPROVAL_REASON:-operator reviewed final preflight packet and approved next-stage execute review packet only}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-operator-approval-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$FINAL_PREFLIGHT_FILE" ]; then
  echo "final_preflight_file_required=false"
  exit 1
fi

if [ ! -f "$FINAL_PREFLIGHT_FILE" ]; then
  echo "final_preflight_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1"
echo "operator_approval_label=$OPERATOR_APPROVAL_LABEL"
echo "out_dir=$OUT_DIR"

cp "$FINAL_PREFLIGHT_FILE" "$OUT_DIR/final-preflight.json"

node - "$OUT_DIR/final-preflight.json" "$OUT_DIR/operator-approval.nohash.json" "$OPERATOR_APPROVAL_LABEL" "$OPERATOR_APPROVAL_REASON" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const preflightFile = process.argv[2];
const outFile = process.argv[3];
const operatorApprovalLabel = process.argv[4];
const operatorApprovalReason = process.argv[5];

const preflight = JSON.parse(fs.readFileSync(preflightFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeId = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);

if (!safeId(operatorApprovalLabel)) fail("operator_approval_label_safe=false");

if (preflight.marker !== "VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1") fail("operator_approval_preflight_marker_valid=false");
if (preflight.ok !== true) fail("operator_approval_preflight_ok=false");
if (!isSha(preflight.preflight_id)) fail("operator_approval_preflight_id_valid=false");

const copy = JSON.parse(JSON.stringify(preflight));
delete copy.preflight_id;
delete copy.preflight_id_scope;
const recomputed = crypto.createHash("sha256").update(JSON.stringify(copy, null, 2) + "\n").digest("hex");

if (recomputed !== preflight.preflight_id) fail("operator_approval_preflight_id_hash_verified=false");

if (preflight.preflight_state !== "final_preflight_ready_not_approved") fail("operator_approval_preflight_state_valid=false");
if (preflight.execution_decision !== "not_approved_not_executed") fail("operator_approval_preflight_execution_decision_valid=false");

if (!isSha(preflight.plan_id)) fail("operator_approval_plan_id_valid=false");
if (!isSha(preflight.review_id)) fail("operator_approval_review_id_valid=false");
if (!isSha(preflight.request_id)) fail("operator_approval_request_id_valid=false");
if (!(preflight.selected_type === "operator_published" || preflight.selected_type === "mirrored")) fail("operator_approval_selected_type_valid=false");
if (!safeId(preflight.dataset_id)) fail("operator_approval_dataset_id_safe=false");
if (preflight.selected_type === "mirrored" && !safeId(preflight.mirror_node_label)) fail("operator_approval_mirror_node_label_safe=false");
if (!isSha(preflight.manifest_sha256)) fail("operator_approval_manifest_sha256_valid=false");
if (!isSha(preflight.content_root_sha256)) fail("operator_approval_content_root_sha256_valid=false");
if (Number(preflight.object_count) <= 0) fail("operator_approval_object_count_valid=false");
if (Number(preflight.total_bytes) < 0) fail("operator_approval_total_bytes_valid=false");

const plan = preflight.dry_run_plan_validation || {};
if (plan.dry_run_plan_valid !== true) fail("operator_approval_dry_run_plan_valid=false");
if (plan.plan_id_hash_verified !== true) fail("operator_approval_plan_id_hash_verified=false");
if (plan.review_packet_valid !== true) fail("operator_approval_review_packet_valid=false");
if (plan.review_id_hash_verified !== true) fail("operator_approval_review_id_hash_verified=false");
if (plan.request_id_hash_verified !== true) fail("operator_approval_request_id_hash_verified=false");
if (plan.dry_run_only !== true) fail("operator_approval_dry_run_only=false");

const dup = preflight.local_duplicate_check || {};
if (dup.duplicate_local_availability_check_performed !== true) fail("operator_approval_duplicate_check_performed=false");

const verify = preflight.final_peer_verify || {};
if (verify.source_peer_reachable !== true) fail("operator_approval_source_peer_reachable=false");
if (verify.final_peer_content_verify_green !== true) fail("operator_approval_final_peer_content_verify_green=false");
if (!isSha(verify.peer_select_verify_receipt_sha256)) fail("operator_approval_final_verify_receipt_sha_valid=false");
if (!isSha(verify.verified_object_sha256)) fail("operator_approval_verified_object_sha_valid=false");

const required = preflight.required_before_execution || {};
if (required.explicit_operator_approval_required !== true) fail("operator_approval_explicit_operator_approval_required=false");
if (required.pre_execution_backup_required !== true) fail("operator_approval_backup_required=false");
if (required.backup_created_now !== false) fail("operator_approval_backup_created_now_not_false");
if (required.operator_terminal_execute_required !== true) fail("operator_approval_operator_terminal_execute_required=false");
if (required.final_command_review_required !== true) fail("operator_approval_final_command_review_required=false");

const gate = preflight.operator_gate || {};
if (gate.operator_review_required !== true) fail("operator_approval_operator_review_required=false");
if (gate.operator_approved_now !== false) fail("operator_approval_preflight_operator_approved_now_not_false");
if (gate.execution_allowed_now !== false) fail("operator_approval_preflight_execution_allowed_now_not_false");
if (gate.mirror_executed_now !== false) fail("operator_approval_preflight_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("operator_approval_preflight_pin_executed_now_not_false");

const safety = preflight.public_safety || {};
if (safety.final_preflight_packet_public_safe !== true) fail("operator_approval_preflight_packet_public_safe=false");
if (safety.public_mutation !== false) fail("operator_approval_preflight_public_mutation_not_false");
if (safety.ledger_write !== false) fail("operator_approval_preflight_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("operator_approval_preflight_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("operator_approval_preflight_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("operator_approval_preflight_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("operator_approval_preflight_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("operator_approval_preflight_local_storage_root_disclosed_not_false");

const approval = {
  marker: "VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1",
  version: 1,
  ok: true,
  approval_state: "operator_approved_for_separate_execute_review_packet_only",
  approval_scope: "approval_packet_only_no_execution",
  operator_approval_label: operatorApprovalLabel,
  operator_approval_reason: operatorApprovalReason,
  preflight_id: preflight.preflight_id,
  plan_id: preflight.plan_id,
  review_id: preflight.review_id,
  request_id: preflight.request_id,
  selected_type: preflight.selected_type,
  dataset_id: preflight.dataset_id,
  mirror_node_label: preflight.selected_type === "mirrored" ? preflight.mirror_node_label : null,
  manifest_sha256: preflight.manifest_sha256,
  content_root_sha256: preflight.content_root_sha256,
  object_count: preflight.object_count,
  total_bytes: preflight.total_bytes,
  approved_preflight: {
    final_preflight_valid: true,
    preflight_id_hash_verified: true,
    dry_run_plan_valid: true,
    plan_id_hash_verified: true,
    review_packet_valid: true,
    review_id_hash_verified: true,
    request_id_hash_verified: true,
    duplicate_local_availability_check_performed: true,
    duplicate_found: Boolean((preflight.local_duplicate_check || {}).duplicate_found),
    source_peer_reachable: true,
    final_peer_content_verify_green: true,
    final_peer_select_verify_receipt_sha256: verify.peer_select_verify_receipt_sha256
  },
  operator_gate: {
    explicit_operator_approval_recorded_now: true,
    operator_approved_for_next_execute_review_packet: true,
    execution_allowed_now: false,
    execute_packet_created_now: false,
    command_rendered_now: false,
    command_executed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false
  },
  required_after_approval_before_execution: {
    pre_execution_backup_required: true,
    backup_created_now: false,
    final_command_review_required: true,
    exact_execute_command_packet_required: true,
    operator_terminal_execute_required: true,
    final_runtime_duplicate_guard_required: true
  },
  public_safety: {
    approval_packet_public_safe: true,
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

fs.writeFileSync(outFile, JSON.stringify(approval, null, 2) + "\n");

console.log("operator_approval_preflight_marker_valid=true");
console.log("operator_approval_preflight_id_hash_verified=true");
console.log("operator_approval_dry_run_plan_valid=true");
console.log("operator_approval_plan_id_hash_verified=true");
console.log("operator_approval_review_id_hash_verified=true");
console.log("operator_approval_request_id_hash_verified=true");
console.log("operator_approval_duplicate_local_availability_check_performed=true");
console.log("operator_approval_source_peer_reachable=true");
console.log("operator_approval_final_peer_content_verify_green=true");
console.log("operator_approval_explicit_operator_approval_recorded_now=true");
console.log("operator_approval_execution_allowed_now=false");
console.log("operator_approval_execute_packet_created_now=false");
console.log("operator_approval_command_rendered_now=false");
console.log("operator_approval_command_executed_now=false");
console.log("operator_approval_mirror_executed_now=false");
console.log("operator_approval_pin_executed_now=false");
console.log("operator_approval_public_mutation=false");
console.log("operator_approval_ledger_write=false");
console.log("operator_approval_wc_credit_award=false");
NODE

APPROVAL_ID="$(sha256sum "$OUT_DIR/operator-approval.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/operator-approval.nohash.json" "$OUT_DIR/operator-approval.json" "$APPROVAL_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const approvalId = process.argv[4];

const approval = JSON.parse(fs.readFileSync(input, "utf8"));
approval.approval_id = approvalId;
approval.approval_id_scope = "sha256 over operator approval packet without approval_id fields";

fs.writeFileSync(output, JSON.stringify(approval, null, 2) + "\n");
NODE

node - "$OUT_DIR/operator-approval.json" <<'NODE'
const fs = require("node:fs");
const approval = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (approval.marker !== "VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1") fail("operator_approval_marker_valid=false");
if (approval.ok !== true) fail("operator_approval_ok=false");
if (!isSha(approval.approval_id)) fail("operator_approval_id_valid=false");
if (approval.approval_state !== "operator_approved_for_separate_execute_review_packet_only") fail("operator_approval_state_valid=false");
if (approval.approval_scope !== "approval_packet_only_no_execution") fail("operator_approval_scope_valid=false");

const preflight = approval.approved_preflight || {};
if (preflight.final_preflight_valid !== true) fail("operator_approval_final_preflight_valid=false");
if (preflight.preflight_id_hash_verified !== true) fail("operator_approval_preflight_id_hash_verified=false");
if (preflight.dry_run_plan_valid !== true) fail("operator_approval_dry_run_plan_valid=false");
if (preflight.plan_id_hash_verified !== true) fail("operator_approval_plan_id_hash_verified=false");
if (preflight.review_id_hash_verified !== true) fail("operator_approval_review_id_hash_verified=false");
if (preflight.request_id_hash_verified !== true) fail("operator_approval_request_id_hash_verified=false");
if (preflight.duplicate_local_availability_check_performed !== true) fail("operator_approval_duplicate_check_performed=false");
if (preflight.source_peer_reachable !== true) fail("operator_approval_source_peer_reachable=false");
if (preflight.final_peer_content_verify_green !== true) fail("operator_approval_final_verify_green=false");

const gate = approval.operator_gate || {};
if (gate.explicit_operator_approval_recorded_now !== true) fail("operator_approval_recorded_now=false");
if (gate.operator_approved_for_next_execute_review_packet !== true) fail("operator_approval_for_next_execute_review=false");
if (gate.execution_allowed_now !== false) fail("operator_approval_execution_allowed_now_not_false");
if (gate.execute_packet_created_now !== false) fail("operator_approval_execute_packet_created_now_not_false");
if (gate.command_rendered_now !== false) fail("operator_approval_command_rendered_now_not_false");
if (gate.command_executed_now !== false) fail("operator_approval_command_executed_now_not_false");
if (gate.mirror_executed_now !== false) fail("operator_approval_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("operator_approval_pin_executed_now_not_false");

const required = approval.required_after_approval_before_execution || {};
if (required.pre_execution_backup_required !== true) fail("operator_approval_backup_required=false");
if (required.backup_created_now !== false) fail("operator_approval_backup_created_now_not_false");
if (required.final_command_review_required !== true) fail("operator_approval_final_command_review_required=false");
if (required.exact_execute_command_packet_required !== true) fail("operator_approval_exact_execute_command_packet_required=false");
if (required.operator_terminal_execute_required !== true) fail("operator_approval_terminal_execute_required=false");
if (required.final_runtime_duplicate_guard_required !== true) fail("operator_approval_final_runtime_duplicate_guard_required=false");

const safety = approval.public_safety || {};
if (safety.approval_packet_public_safe !== true) fail("operator_approval_packet_public_safe=false");
if (safety.public_post_upload !== false) fail("operator_approval_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("operator_approval_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("operator_approval_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("operator_approval_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("operator_approval_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("operator_approval_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("operator_approval_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("operator_approval_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("operator_approval_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("operator_approval_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("operator_approval_local_storage_root_disclosed_not_false");

console.log("operator_approval_marker_valid=true");
console.log("operator_approval_id_valid=true");
console.log("operator_approval_packet_created=true");
console.log("operator_approval_recorded_now=true");
console.log("operator_approval_for_next_execute_review_packet=true");
console.log("operator_approval_execution_allowed_now=false");
console.log("operator_approval_execute_packet_created_now=false");
console.log("operator_approval_command_rendered_now=false");
console.log("operator_approval_command_executed_now=false");
console.log("operator_approval_mirror_executed_now=false");
console.log("operator_approval_pin_executed_now=false");
console.log("operator_approval_public_mutation=false");
console.log("operator_approval_ledger_write=false");
console.log("operator_approval_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/operator-approval.json"; then
  echo "operator_approval_private_leak_scan_green=false"
  exit 1
fi

echo "operator_approval_packet_path=$OUT_DIR/operator-approval.json"
echo "operator_approval_id=$APPROVAL_ID"
echo "operator_approval_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1_GREEN"
