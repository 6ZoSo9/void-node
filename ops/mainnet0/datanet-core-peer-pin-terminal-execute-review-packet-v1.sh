#!/usr/bin/env bash
set -euo pipefail

RUNTIME_DUPLICATE_GUARD_FILE="${RUNTIME_DUPLICATE_GUARD_FILE:-}"
TERMINAL_REVIEW_OPERATOR_LABEL="${TERMINAL_REVIEW_OPERATOR_LABEL:-void-terminal-review-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-terminal-execute-review-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$RUNTIME_DUPLICATE_GUARD_FILE" ]; then
  echo "terminal_execute_review_runtime_duplicate_guard_file_required=false"
  exit 1
fi

if [ ! -f "$RUNTIME_DUPLICATE_GUARD_FILE" ]; then
  echo "terminal_execute_review_runtime_duplicate_guard_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_TERMINAL_EXECUTE_REVIEW_PACKET_V1"
echo "terminal_review_operator_label=$TERMINAL_REVIEW_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

cp "$RUNTIME_DUPLICATE_GUARD_FILE" "$OUT_DIR/runtime-duplicate-guard.json"

node - "$OUT_DIR/runtime-duplicate-guard.json" "$OUT_DIR/terminal-execute-review.nohash.json" "$TERMINAL_REVIEW_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const guardFile = process.argv[2];
const outFile = process.argv[3];
const terminalReviewOperatorLabel = process.argv[4];

const guard = JSON.parse(fs.readFileSync(guardFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeId = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);

if (!safeId(terminalReviewOperatorLabel)) fail("terminal_execute_review_operator_label_safe=false");

if (guard.marker !== "VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_V1") fail("terminal_execute_review_runtime_guard_marker_valid=false");
if (guard.ok !== true) fail("terminal_execute_review_runtime_guard_ok=false");
if (!isSha(guard.runtime_duplicate_guard_id)) fail("terminal_execute_review_runtime_guard_id_valid=false");

const guardCopy = JSON.parse(JSON.stringify(guard));
delete guardCopy.runtime_duplicate_guard_id;
delete guardCopy.runtime_duplicate_guard_id_scope;
const recomputedGuardId = crypto.createHash("sha256").update(JSON.stringify(guardCopy, null, 2) + "\n").digest("hex");

if (recomputedGuardId !== guard.runtime_duplicate_guard_id) fail("terminal_execute_review_runtime_guard_id_hash_verified=false");

if (guard.guard_state !== "final_runtime_duplicate_guard_complete_not_executed") fail("terminal_execute_review_runtime_guard_state_valid=false");

if (!isSha(guard.command_packet_id)) fail("terminal_execute_review_command_packet_id_valid=false");
if (!isSha(guard.approval_id)) fail("terminal_execute_review_approval_id_valid=false");
if (!isSha(guard.preflight_id)) fail("terminal_execute_review_preflight_id_valid=false");
if (!isSha(guard.plan_id)) fail("terminal_execute_review_plan_id_valid=false");
if (!isSha(guard.review_id)) fail("terminal_execute_review_review_id_valid=false");
if (!isSha(guard.request_id)) fail("terminal_execute_review_request_id_valid=false");

if (!(guard.selected_type === "operator_published" || guard.selected_type === "mirrored")) fail("terminal_execute_review_selected_type_valid=false");
if (!safeId(guard.dataset_id)) fail("terminal_execute_review_dataset_id_safe=false");
if (guard.selected_type === "mirrored" && !safeId(guard.mirror_node_label)) fail("terminal_execute_review_mirror_node_label_safe=false");
if (!safeId(guard.target_mirror_node_label)) fail("terminal_execute_review_target_mirror_node_label_safe=false");
if (!isSha(guard.manifest_sha256)) fail("terminal_execute_review_manifest_sha256_valid=false");
if (!isSha(guard.content_root_sha256)) fail("terminal_execute_review_content_root_sha256_valid=false");
if (Number(guard.object_count) <= 0) fail("terminal_execute_review_object_count_valid=false");
if (Number(guard.total_bytes) < 0) fail("terminal_execute_review_total_bytes_valid=false");

const validation = guard.command_packet_validation || {};
if (validation.exact_execute_command_packet_valid !== true) fail("terminal_execute_review_command_packet_valid=false");
if (validation.command_packet_id_hash_verified !== true) fail("terminal_execute_review_command_packet_id_hash_verified=false");
if (validation.approval_id_hash_verified !== true) fail("terminal_execute_review_approval_id_hash_verified=false");
if (validation.final_preflight_valid !== true) fail("terminal_execute_review_final_preflight_valid=false");
if (validation.preflight_id_hash_verified !== true) fail("terminal_execute_review_preflight_id_hash_verified=false");
if (validation.dry_run_plan_valid !== true) fail("terminal_execute_review_dry_run_plan_valid=false");
if (validation.plan_id_hash_verified !== true) fail("terminal_execute_review_plan_id_hash_verified=false");
if (validation.review_id_hash_verified !== true) fail("terminal_execute_review_review_id_hash_verified=false");
if (validation.request_id_hash_verified !== true) fail("terminal_execute_review_request_id_hash_verified=false");
if (validation.source_peer_reachable !== true) fail("terminal_execute_review_source_peer_reachable=false");
if (validation.final_peer_content_verify_green !== true) fail("terminal_execute_review_final_peer_content_verify_green=false");
if (validation.operator_approval_recorded_now !== true) fail("terminal_execute_review_operator_approval_recorded=false");

const duplicate = guard.final_runtime_duplicate_guard || {};
if (duplicate.performed_now !== true) fail("terminal_execute_review_runtime_duplicate_guard_performed=false");
if (duplicate.local_availability_index_checked_now !== true) fail("terminal_execute_review_local_availability_index_checked=false");

const exact = guard.exact_execute_command || {};
if (guard.selected_type === "operator_published") {
  if (exact.current_executor_supports_selected_type !== true) fail("terminal_execute_review_published_executor_support=false");
  if (exact.command_rendered_now !== true) fail("terminal_execute_review_published_command_rendered=false");
} else {
  if (exact.current_executor_supports_selected_type !== false) fail("terminal_execute_review_mirrored_executor_support_not_false");
  if (exact.mirrored_source_executor_required !== true) fail("terminal_execute_review_mirrored_executor_required=false");
  if (exact.command_rendered_now !== false) fail("terminal_execute_review_mirrored_command_rendered_not_false");
}

if (exact.command_executed_now !== false) fail("terminal_execute_review_prior_command_executed_now_not_false");

const required = guard.required_after_runtime_duplicate_guard_before_execution || {};
if (required.final_operator_terminal_review_required !== true) fail("terminal_execute_review_final_terminal_review_required=false");
if (required.pre_execution_backup_required !== true) fail("terminal_execute_review_backup_required=false");
if (required.backup_created_now !== false) fail("terminal_execute_review_backup_created_now_not_false");
if (required.exact_command_packet_recheck_required !== true) fail("terminal_execute_review_exact_command_recheck_required=false");
if (required.runtime_duplicate_guard_recheck_required_if_delayed !== true) fail("terminal_execute_review_runtime_guard_recheck_if_delayed_required=false");
if (required.operator_terminal_execute_required !== true) fail("terminal_execute_review_operator_terminal_execute_required=false");

const gate = guard.operator_gate || {};
if (gate.runtime_duplicate_guard_performed_now !== true) fail("terminal_execute_review_runtime_guard_gate_performed=false");
if (gate.execution_allowed_now !== false) fail("terminal_execute_review_prior_execution_allowed_now_not_false");
if (gate.command_executed_now !== false) fail("terminal_execute_review_prior_gate_command_executed_now_not_false");
if (gate.mirror_executed_now !== false) fail("terminal_execute_review_prior_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("terminal_execute_review_prior_pin_executed_now_not_false");

const safety = guard.public_safety || {};
if (safety.runtime_duplicate_guard_packet_public_safe !== true) fail("terminal_execute_review_runtime_guard_public_safe=false");
if (safety.public_mutation !== false) fail("terminal_execute_review_runtime_guard_public_mutation_not_false");
if (safety.ledger_write !== false) fail("terminal_execute_review_runtime_guard_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("terminal_execute_review_runtime_guard_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("terminal_execute_review_runtime_guard_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("terminal_execute_review_runtime_guard_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("terminal_execute_review_runtime_guard_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("terminal_execute_review_runtime_guard_local_storage_root_disclosed_not_false");

const duplicateFound = duplicate.duplicate_found === true;
const mirroredExecutorGap = exact.mirrored_source_executor_required === true;

let executionDecision = "manual_terminal_execute_review_required_not_executed";
if (duplicateFound) executionDecision = "blocked_duplicate_found_not_executed";
if (mirroredExecutorGap) executionDecision = duplicateFound
  ? "blocked_duplicate_and_mirrored_executor_gap_not_executed"
  : "blocked_mirrored_executor_gap_not_executed";

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_TERMINAL_EXECUTE_REVIEW_PACKET_V1",
  version: 1,
  ok: true,
  terminal_review_state: "terminal_execute_review_packet_created_command_withheld_not_executed",
  execution_decision: executionDecision,
  terminal_review_operator_label: terminalReviewOperatorLabel,
  runtime_duplicate_guard_id: guard.runtime_duplicate_guard_id,
  command_packet_id: guard.command_packet_id,
  approval_id: guard.approval_id,
  preflight_id: guard.preflight_id,
  plan_id: guard.plan_id,
  review_id: guard.review_id,
  request_id: guard.request_id,
  selected_type: guard.selected_type,
  dataset_id: guard.dataset_id,
  mirror_node_label: guard.selected_type === "mirrored" ? guard.mirror_node_label : null,
  target_mirror_node_label: guard.target_mirror_node_label,
  manifest_sha256: guard.manifest_sha256,
  content_root_sha256: guard.content_root_sha256,
  object_count: guard.object_count,
  total_bytes: guard.total_bytes,
  runtime_guard_validation: {
    runtime_duplicate_guard_packet_valid: true,
    runtime_duplicate_guard_id_hash_verified: true,
    exact_execute_command_packet_valid: true,
    command_packet_id_hash_verified: true,
    approval_id_hash_verified: true,
    final_preflight_valid: true,
    preflight_id_hash_verified: true,
    dry_run_plan_valid: true,
    plan_id_hash_verified: true,
    review_id_hash_verified: true,
    request_id_hash_verified: true,
    source_peer_reachable: true,
    final_peer_content_verify_green: true,
    operator_approval_recorded_now: true
  },
  final_runtime_duplicate_guard: {
    performed_now: true,
    duplicate_found: duplicateFound,
    duplicate_match_count: Number(duplicate.duplicate_match_count || 0),
    duplicate_match_types: duplicate.duplicate_match_types || "none",
    local_availability_index_checked_now: true
  },
  command_review: {
    command_packet_referenced_by_id: true,
    exact_command_revealed_now: false,
    exact_command_printed_now: false,
    exact_command_copied_to_terminal_now: false,
    command_rendered_in_prior_packet: exact.command_rendered_now === true,
    current_executor_supports_selected_type: exact.current_executor_supports_selected_type === true,
    mirrored_source_executor_required: mirroredExecutorGap,
    terminal_execute_review_packet_created_now: true
  },
  terminal_gate: {
    final_operator_terminal_review_required: true,
    operator_terminal_execute_required: true,
    terminal_execute_allowed_now: false,
    terminal_execute_performed_now: false,
    shell_execution_performed_now: false,
    command_executed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false
  },
  required_after_terminal_review_before_execution: {
    exact_command_packet_recheck_required: true,
    runtime_duplicate_guard_recheck_required_if_delayed: true,
    pre_execution_backup_required: true,
    backup_created_now: false,
    manual_operator_terminal_action_required: true,
    automatic_execution_allowed: false
  },
  public_safety: {
    terminal_execute_review_packet_public_safe: true,
    public_post_upload: false,
    public_shell_execution: false,
    public_mutation: false,
    automatic_mirror: false,
    automatic_pin: false,
    ledger_write: false,
    wc_credit_award: false,
    command_string_disclosed: false,
    local_path_disclosed: false,
    absolute_path_disclosed: false,
    operator_home_path_disclosed: false,
    local_storage_root_disclosed: false
  }
};

fs.writeFileSync(outFile, JSON.stringify(packet, null, 2) + "\n");

console.log("terminal_execute_review_runtime_guard_marker_valid=true");
console.log("terminal_execute_review_runtime_guard_id_hash_verified=true");
console.log("terminal_execute_review_command_packet_id_hash_verified=true");
console.log("terminal_execute_review_approval_id_hash_verified=true");
console.log("terminal_execute_review_preflight_id_hash_verified=true");
console.log("terminal_execute_review_plan_id_hash_verified=true");
console.log("terminal_execute_review_review_id_hash_verified=true");
console.log("terminal_execute_review_request_id_hash_verified=true");
console.log("terminal_execute_review_runtime_duplicate_guard_performed_now=true");
console.log("terminal_execute_review_duplicate_found=" + String(duplicateFound));
console.log("terminal_execute_review_selected_type=" + guard.selected_type);
console.log("terminal_execute_review_current_executor_supports_selected_type=" + String(exact.current_executor_supports_selected_type === true));
console.log("terminal_execute_review_mirrored_source_executor_required=" + String(mirroredExecutorGap));
console.log("terminal_execute_review_command_packet_referenced_by_id=true");
console.log("terminal_execute_review_exact_command_revealed_now=false");
console.log("terminal_execute_review_exact_command_printed_now=false");
console.log("terminal_execute_review_terminal_execute_allowed_now=false");
console.log("terminal_execute_review_terminal_execute_performed_now=false");
console.log("terminal_execute_review_shell_execution_performed_now=false");
console.log("terminal_execute_review_command_executed_now=false");
console.log("terminal_execute_review_mirror_executed_now=false");
console.log("terminal_execute_review_pin_executed_now=false");
console.log("terminal_execute_review_public_mutation=false");
console.log("terminal_execute_review_ledger_write=false");
console.log("terminal_execute_review_wc_credit_award=false");
NODE

TERMINAL_REVIEW_ID="$(sha256sum "$OUT_DIR/terminal-execute-review.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/terminal-execute-review.nohash.json" "$OUT_DIR/terminal-execute-review.json" "$TERMINAL_REVIEW_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const terminalReviewId = process.argv[4];

const packet = JSON.parse(fs.readFileSync(input, "utf8"));
packet.terminal_execute_review_id = terminalReviewId;
packet.terminal_execute_review_id_scope = "sha256 over terminal execute review packet without terminal_execute_review_id fields";

fs.writeFileSync(output, JSON.stringify(packet, null, 2) + "\n");
NODE

node - "$OUT_DIR/terminal-execute-review.json" <<'NODE'
const fs = require("node:fs");
const packet = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_TERMINAL_EXECUTE_REVIEW_PACKET_V1") fail("terminal_execute_review_marker_valid=false");
if (packet.ok !== true) fail("terminal_execute_review_ok=false");
if (!isSha(packet.terminal_execute_review_id)) fail("terminal_execute_review_id_valid=false");
if (packet.terminal_review_state !== "terminal_execute_review_packet_created_command_withheld_not_executed") fail("terminal_execute_review_state_valid=false");

const validation = packet.runtime_guard_validation || {};
if (validation.runtime_duplicate_guard_packet_valid !== true) fail("terminal_execute_review_runtime_guard_packet_valid=false");
if (validation.runtime_duplicate_guard_id_hash_verified !== true) fail("terminal_execute_review_runtime_guard_id_hash_verified=false");
if (validation.command_packet_id_hash_verified !== true) fail("terminal_execute_review_command_packet_id_hash_verified=false");
if (validation.approval_id_hash_verified !== true) fail("terminal_execute_review_approval_id_hash_verified=false");
if (validation.preflight_id_hash_verified !== true) fail("terminal_execute_review_preflight_id_hash_verified=false");
if (validation.plan_id_hash_verified !== true) fail("terminal_execute_review_plan_id_hash_verified=false");
if (validation.review_id_hash_verified !== true) fail("terminal_execute_review_review_id_hash_verified=false");
if (validation.request_id_hash_verified !== true) fail("terminal_execute_review_request_id_hash_verified=false");

const duplicate = packet.final_runtime_duplicate_guard || {};
if (duplicate.performed_now !== true) fail("terminal_execute_review_runtime_duplicate_guard_performed_now=false");
if (duplicate.local_availability_index_checked_now !== true) fail("terminal_execute_review_local_availability_checked=false");

const review = packet.command_review || {};
if (review.command_packet_referenced_by_id !== true) fail("terminal_execute_review_command_packet_referenced_by_id=false");
if (review.exact_command_revealed_now !== false) fail("terminal_execute_review_exact_command_revealed_now_not_false");
if (review.exact_command_printed_now !== false) fail("terminal_execute_review_exact_command_printed_now_not_false");
if (review.exact_command_copied_to_terminal_now !== false) fail("terminal_execute_review_exact_command_copied_to_terminal_now_not_false");
if (review.terminal_execute_review_packet_created_now !== true) fail("terminal_execute_review_packet_created_now=false");

if (packet.selected_type === "operator_published") {
  if (review.current_executor_supports_selected_type !== true) fail("terminal_execute_review_published_executor_support=false");
} else if (packet.selected_type === "mirrored") {
  if (review.current_executor_supports_selected_type !== false) fail("terminal_execute_review_mirrored_executor_support_not_false");
  if (review.mirrored_source_executor_required !== true) fail("terminal_execute_review_mirrored_executor_required=false");
} else {
  fail("terminal_execute_review_selected_type_valid=false");
}

const gate = packet.terminal_gate || {};
if (gate.final_operator_terminal_review_required !== true) fail("terminal_execute_review_final_operator_terminal_review_required=false");
if (gate.operator_terminal_execute_required !== true) fail("terminal_execute_review_operator_terminal_execute_required=false");
if (gate.terminal_execute_allowed_now !== false) fail("terminal_execute_review_terminal_execute_allowed_now_not_false");
if (gate.terminal_execute_performed_now !== false) fail("terminal_execute_review_terminal_execute_performed_now_not_false");
if (gate.shell_execution_performed_now !== false) fail("terminal_execute_review_shell_execution_performed_now_not_false");
if (gate.command_executed_now !== false) fail("terminal_execute_review_command_executed_now_not_false");
if (gate.mirror_executed_now !== false) fail("terminal_execute_review_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("terminal_execute_review_pin_executed_now_not_false");

const safety = packet.public_safety || {};
if (safety.terminal_execute_review_packet_public_safe !== true) fail("terminal_execute_review_packet_public_safe=false");
if (safety.public_post_upload !== false) fail("terminal_execute_review_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("terminal_execute_review_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("terminal_execute_review_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("terminal_execute_review_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("terminal_execute_review_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("terminal_execute_review_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("terminal_execute_review_wc_credit_award_not_false");
if (safety.command_string_disclosed !== false) fail("terminal_execute_review_command_string_disclosed_not_false");
if (safety.local_path_disclosed !== false) fail("terminal_execute_review_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("terminal_execute_review_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("terminal_execute_review_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("terminal_execute_review_local_storage_root_disclosed_not_false");

console.log("terminal_execute_review_marker_valid=true");
console.log("terminal_execute_review_id_valid=true");
console.log("terminal_execute_review_packet_created=true");
console.log("terminal_execute_review_runtime_guard_id_hash_verified=true");
console.log("terminal_execute_review_command_packet_referenced_by_id=true");
console.log("terminal_execute_review_exact_command_revealed_now=false");
console.log("terminal_execute_review_exact_command_printed_now=false");
console.log("terminal_execute_review_terminal_execute_allowed_now=false");
console.log("terminal_execute_review_terminal_execute_performed_now=false");
console.log("terminal_execute_review_shell_execution_performed_now=false");
console.log("terminal_execute_review_command_executed_now=false");
console.log("terminal_execute_review_mirror_executed_now=false");
console.log("terminal_execute_review_pin_executed_now=false");
console.log("terminal_execute_review_public_mutation=false");
console.log("terminal_execute_review_ledger_write=false");
console.log("terminal_execute_review_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/terminal-execute-review.json"; then
  echo "terminal_execute_review_private_leak_scan_green=false"
  exit 1
fi

echo "terminal_execute_review_packet_path=$OUT_DIR/terminal-execute-review.json"
echo "terminal_execute_review_id=$TERMINAL_REVIEW_ID"
echo "terminal_execute_review_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_TERMINAL_EXECUTE_REVIEW_PACKET_V1_GREEN"
