#!/usr/bin/env bash
set -euo pipefail

TERMINAL_EXECUTE_REVIEW_FILE="${TERMINAL_EXECUTE_REVIEW_FILE:-}"
MANUAL_EXECUTE_OPERATOR_LABEL="${MANUAL_EXECUTE_OPERATOR_LABEL:-void-manual-execute-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-manual-execute-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$TERMINAL_EXECUTE_REVIEW_FILE" ]; then
  echo "manual_execute_terminal_review_file_required=false"
  exit 1
fi

if [ ! -f "$TERMINAL_EXECUTE_REVIEW_FILE" ]; then
  echo "manual_execute_terminal_review_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_V1"
echo "manual_execute_operator_label=$MANUAL_EXECUTE_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

cp "$TERMINAL_EXECUTE_REVIEW_FILE" "$OUT_DIR/terminal-execute-review.json"

node - "$OUT_DIR/terminal-execute-review.json" "$OUT_DIR/manual-execute.nohash.json" "$MANUAL_EXECUTE_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const reviewFile = process.argv[2];
const outFile = process.argv[3];
const operatorLabel = process.argv[4];

const review = JSON.parse(fs.readFileSync(reviewFile, "utf8"));

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeLabel = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);

if (!safeLabel(operatorLabel)) fail("manual_execute_operator_label_safe=false");

if (review.marker !== "VOID_DATANET_CORE_PEER_PIN_TERMINAL_EXECUTE_REVIEW_PACKET_V1") fail("manual_execute_terminal_review_marker_valid=false");
if (review.ok !== true) fail("manual_execute_terminal_review_ok=false");
if (!isSha(review.terminal_execute_review_id)) fail("manual_execute_terminal_review_id_valid=false");

const reviewCopy = JSON.parse(JSON.stringify(review));
delete reviewCopy.terminal_execute_review_id;
delete reviewCopy.terminal_execute_review_id_scope;
const recomputedReviewId = crypto.createHash("sha256").update(JSON.stringify(reviewCopy, null, 2) + "\n").digest("hex");
if (recomputedReviewId !== review.terminal_execute_review_id) fail("manual_execute_terminal_review_id_hash_verified=false");

if (review.terminal_review_state !== "terminal_execute_review_packet_created_command_withheld_not_executed") {
  fail("manual_execute_terminal_review_state_valid=false");
}

for (const [name, value] of Object.entries({
  runtime_duplicate_guard_id: review.runtime_duplicate_guard_id,
  command_packet_id: review.command_packet_id,
  approval_id: review.approval_id,
  preflight_id: review.preflight_id,
  plan_id: review.plan_id,
  review_id: review.review_id,
  request_id: review.request_id,
  manifest_sha256: review.manifest_sha256,
  content_root_sha256: review.content_root_sha256
})) {
  if (!isSha(value)) fail(`manual_execute_${name}_valid=false`);
}

if (!(review.selected_type === "operator_published" || review.selected_type === "mirrored")) fail("manual_execute_selected_type_valid=false");
if (!safeLabel(review.dataset_id)) fail("manual_execute_dataset_id_safe=false");
if (review.selected_type === "mirrored" && !safeLabel(review.mirror_node_label)) fail("manual_execute_mirror_node_label_safe=false");

const validation = review.runtime_guard_validation || {};
const requiredValidationTrue = [
  "runtime_duplicate_guard_packet_valid",
  "runtime_duplicate_guard_id_hash_verified",
  "exact_execute_command_packet_valid",
  "command_packet_id_hash_verified",
  "approval_id_hash_verified",
  "final_preflight_valid",
  "preflight_id_hash_verified",
  "dry_run_plan_valid",
  "plan_id_hash_verified",
  "review_id_hash_verified",
  "request_id_hash_verified",
  "source_peer_reachable",
  "final_peer_content_verify_green",
  "operator_approval_recorded_now"
];

for (const key of requiredValidationTrue) {
  if (validation[key] !== true) fail(`manual_execute_${key}=false`);
}

const duplicate = review.final_runtime_duplicate_guard || {};
if (duplicate.performed_now !== true) fail("manual_execute_runtime_duplicate_guard_performed_now=false");
if (duplicate.local_availability_index_checked_now !== true) fail("manual_execute_local_availability_index_checked_now=false");

const commandReview = review.command_review || {};
if (commandReview.command_packet_referenced_by_id !== true) fail("manual_execute_command_packet_referenced_by_id=false");
if (commandReview.exact_command_revealed_now !== false) fail("manual_execute_exact_command_revealed_now_not_false");
if (commandReview.exact_command_printed_now !== false) fail("manual_execute_exact_command_printed_now_not_false");
if (commandReview.exact_command_copied_to_terminal_now !== false) fail("manual_execute_exact_command_copied_to_terminal_now_not_false");

if (review.selected_type === "operator_published") {
  if (commandReview.current_executor_supports_selected_type !== true) fail("manual_execute_published_executor_support=false");
} else {
  if (commandReview.current_executor_supports_selected_type !== false) fail("manual_execute_mirrored_executor_support_not_false");
  if (commandReview.mirrored_source_executor_required !== true) fail("manual_execute_mirrored_executor_required=false");
}

const terminalGate = review.terminal_gate || {};
for (const key of [
  "terminal_execute_allowed_now",
  "terminal_execute_performed_now",
  "shell_execution_performed_now",
  "command_executed_now",
  "mirror_executed_now",
  "pin_executed_now"
]) {
  if (terminalGate[key] !== false) fail(`manual_execute_prior_${key}_not_false`);
}

const safety = review.public_safety || {};
for (const key of [
  "public_shell_execution",
  "public_mutation",
  "automatic_mirror",
  "automatic_pin",
  "ledger_write",
  "wc_credit_award",
  "command_string_disclosed",
  "local_path_disclosed",
  "absolute_path_disclosed",
  "operator_home_path_disclosed",
  "local_storage_root_disclosed"
]) {
  if (safety[key] !== false) fail(`manual_execute_terminal_review_${key}_not_false`);
}

const duplicateFound = duplicate.duplicate_found === true;
const mirroredGap = commandReview.mirrored_source_executor_required === true;

let executionDecision = "manual_execute_packet_created_not_executed";
if (duplicateFound) executionDecision = "blocked_duplicate_found_manual_execute_not_allowed";
if (mirroredGap) executionDecision = duplicateFound
  ? "blocked_duplicate_and_mirrored_executor_gap_manual_execute_not_allowed"
  : "blocked_mirrored_executor_gap_manual_execute_not_allowed";

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_V1",
  version: 1,
  ok: true,
  manual_execute_state: "manual_execute_packet_created_no_terminal_execution",
  execution_decision: executionDecision,
  manual_execute_operator_label: operatorLabel,

  terminal_execute_review_id: review.terminal_execute_review_id,
  runtime_duplicate_guard_id: review.runtime_duplicate_guard_id,
  command_packet_id: review.command_packet_id,
  approval_id: review.approval_id,
  preflight_id: review.preflight_id,
  plan_id: review.plan_id,
  review_id: review.review_id,
  request_id: review.request_id,

  selected_type: review.selected_type,
  dataset_id: review.dataset_id,
  mirror_node_label: review.selected_type === "mirrored" ? review.mirror_node_label : null,
  target_mirror_node_label: review.target_mirror_node_label,
  manifest_sha256: review.manifest_sha256,
  content_root_sha256: review.content_root_sha256,
  object_count: review.object_count,
  total_bytes: review.total_bytes,

  terminal_review_validation: {
    terminal_execute_review_packet_valid: true,
    terminal_execute_review_id_hash_verified: true,
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

  command_handling: {
    command_packet_referenced_by_id: true,
    exact_command_revealed_now: false,
    exact_command_printed_now: false,
    exact_command_copied_to_terminal_now: false,
    command_string_disclosed: false,
    current_executor_supports_selected_type: commandReview.current_executor_supports_selected_type === true,
    mirrored_source_executor_required: mirroredGap,
    manual_execute_packet_created_now: true
  },

  manual_execute_gate: {
    manual_execute_allowed_now: false,
    manual_execute_performed_now: false,
    terminal_execute_allowed_now: false,
    terminal_execute_performed_now: false,
    shell_execution_performed_now: false,
    command_executed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false
  },

  required_before_any_real_execution: {
    explicit_operator_terminal_action_required: true,
    exact_command_packet_recheck_required: true,
    runtime_duplicate_guard_recheck_required_if_delayed: true,
    duplicate_found_must_block_execution: true,
    mirrored_source_executor_gap_must_block_execution: true,
    pre_execution_backup_required: true,
    backup_created_now: false,
    automatic_execution_allowed: false
  },

  public_safety: {
    manual_execute_packet_public_safe: true,
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

console.log("manual_execute_terminal_review_marker_valid=true");
console.log("manual_execute_terminal_review_id_hash_verified=true");
console.log("manual_execute_runtime_guard_id_hash_verified=true");
console.log("manual_execute_command_packet_id_hash_verified=true");
console.log("manual_execute_runtime_duplicate_guard_performed_now=true");
console.log("manual_execute_duplicate_found=" + String(duplicateFound));
console.log("manual_execute_selected_type=" + review.selected_type);
console.log("manual_execute_mirrored_source_executor_required=" + String(mirroredGap));
console.log("manual_execute_command_packet_referenced_by_id=true");
console.log("manual_execute_exact_command_revealed_now=false");
console.log("manual_execute_exact_command_printed_now=false");
console.log("manual_execute_command_string_disclosed=false");
console.log("manual_execute_allowed_now=false");
console.log("manual_execute_performed_now=false");
console.log("manual_execute_terminal_execute_allowed_now=false");
console.log("manual_execute_terminal_execute_performed_now=false");
console.log("manual_execute_shell_execution_performed_now=false");
console.log("manual_execute_command_executed_now=false");
console.log("manual_execute_mirror_executed_now=false");
console.log("manual_execute_pin_executed_now=false");
console.log("manual_execute_public_mutation=false");
console.log("manual_execute_ledger_write=false");
console.log("manual_execute_wc_credit_award=false");
NODE

MANUAL_EXECUTE_ID="$(sha256sum "$OUT_DIR/manual-execute.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/manual-execute.nohash.json" "$OUT_DIR/manual-execute.json" "$MANUAL_EXECUTE_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const manualExecuteId = process.argv[4];

const packet = JSON.parse(fs.readFileSync(input, "utf8"));
packet.manual_execute_id = manualExecuteId;
packet.manual_execute_id_scope = "sha256 over manual execute packet without manual_execute_id fields";

fs.writeFileSync(output, JSON.stringify(packet, null, 2) + "\n");
NODE

node - "$OUT_DIR/manual-execute.json" <<'NODE'
const fs = require("node:fs");
const packet = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_V1") fail("manual_execute_marker_valid=false");
if (packet.ok !== true) fail("manual_execute_ok=false");
if (!isSha(packet.manual_execute_id)) fail("manual_execute_id_valid=false");
if (packet.manual_execute_state !== "manual_execute_packet_created_no_terminal_execution") fail("manual_execute_state_valid=false");

const handling = packet.command_handling || {};
if (handling.command_packet_referenced_by_id !== true) fail("manual_execute_command_packet_referenced_by_id=false");
if (handling.exact_command_revealed_now !== false) fail("manual_execute_exact_command_revealed_now_not_false");
if (handling.exact_command_printed_now !== false) fail("manual_execute_exact_command_printed_now_not_false");
if (handling.command_string_disclosed !== false) fail("manual_execute_command_string_disclosed_not_false");

const gate = packet.manual_execute_gate || {};
for (const key of [
  "manual_execute_allowed_now",
  "manual_execute_performed_now",
  "terminal_execute_allowed_now",
  "terminal_execute_performed_now",
  "shell_execution_performed_now",
  "command_executed_now",
  "mirror_executed_now",
  "pin_executed_now"
]) {
  if (gate[key] !== false) fail(`manual_execute_${key}_not_false`);
}

const safety = packet.public_safety || {};
for (const key of [
  "public_shell_execution",
  "public_mutation",
  "automatic_mirror",
  "automatic_pin",
  "ledger_write",
  "wc_credit_award",
  "command_string_disclosed",
  "local_path_disclosed",
  "absolute_path_disclosed",
  "operator_home_path_disclosed",
  "local_storage_root_disclosed"
]) {
  if (safety[key] !== false) fail(`manual_execute_safety_${key}_not_false`);
}

console.log("manual_execute_marker_valid=true");
console.log("manual_execute_id_valid=true");
console.log("manual_execute_packet_created=true");
console.log("manual_execute_command_packet_referenced_by_id=true");
console.log("manual_execute_exact_command_revealed_now=false");
console.log("manual_execute_exact_command_printed_now=false");
console.log("manual_execute_command_string_disclosed=false");
console.log("manual_execute_allowed_now=false");
console.log("manual_execute_performed_now=false");
console.log("manual_execute_terminal_execute_allowed_now=false");
console.log("manual_execute_terminal_execute_performed_now=false");
console.log("manual_execute_shell_execution_performed_now=false");
console.log("manual_execute_command_executed_now=false");
console.log("manual_execute_mirror_executed_now=false");
console.log("manual_execute_pin_executed_now=false");
console.log("manual_execute_public_mutation=false");
console.log("manual_execute_ledger_write=false");
console.log("manual_execute_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/manual-execute.json"; then
  echo "manual_execute_private_leak_scan_green=false"
  exit 1
fi

echo "manual_execute_packet_path=$OUT_DIR/manual-execute.json"
echo "manual_execute_id=$MANUAL_EXECUTE_ID"
echo "manual_execute_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_V1_GREEN"
