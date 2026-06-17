#!/usr/bin/env bash
set -euo pipefail

OPERATOR_APPROVAL_FILE="${OPERATOR_APPROVAL_FILE:-}"
SOURCE_PEER_BASE="${SOURCE_PEER_BASE:-${PEER_BASE:-${BASE:-http://127.0.0.1:4100}}}"
EXECUTE_OPERATOR_LABEL="${EXECUTE_OPERATOR_LABEL:-void-execute-command-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-exact-execute-command-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$OPERATOR_APPROVAL_FILE" ]; then
  echo "operator_approval_file_required=false"
  exit 1
fi

if [ ! -f "$OPERATOR_APPROVAL_FILE" ]; then
  echo "operator_approval_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_V1"
echo "source_peer_base=$SOURCE_PEER_BASE"
echo "execute_operator_label=$EXECUTE_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

cp "$OPERATOR_APPROVAL_FILE" "$OUT_DIR/operator-approval.json"

node - "$OUT_DIR/operator-approval.json" "$OUT_DIR/exact-command.nohash.json" "$SOURCE_PEER_BASE" "$EXECUTE_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const approvalFile = process.argv[2];
const outFile = process.argv[3];
const sourcePeerBase = process.argv[4];
const executeOperatorLabel = process.argv[5];

const approval = JSON.parse(fs.readFileSync(approvalFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeId = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);
const safeBase = (v) => typeof v === "string" && /^https?:\/\/[a-zA-Z0-9._:-]+$/.test(v);

if (!safeId(executeOperatorLabel)) fail("exact_execute_command_operator_label_safe=false");
if (!safeBase(sourcePeerBase)) fail("exact_execute_command_source_peer_base_safe=false");

if (approval.marker !== "VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1") fail("exact_execute_command_approval_marker_valid=false");
if (approval.ok !== true) fail("exact_execute_command_approval_ok=false");
if (!isSha(approval.approval_id)) fail("exact_execute_command_approval_id_valid=false");

const approvalCopy = JSON.parse(JSON.stringify(approval));
delete approvalCopy.approval_id;
delete approvalCopy.approval_id_scope;
const recomputedApprovalId = crypto.createHash("sha256").update(JSON.stringify(approvalCopy, null, 2) + "\n").digest("hex");

if (recomputedApprovalId !== approval.approval_id) fail("exact_execute_command_approval_id_hash_verified=false");

if (approval.approval_state !== "operator_approved_for_separate_execute_review_packet_only") fail("exact_execute_command_approval_state_valid=false");
if (approval.approval_scope !== "approval_packet_only_no_execution") fail("exact_execute_command_approval_scope_valid=false");

if (!isSha(approval.preflight_id)) fail("exact_execute_command_preflight_id_valid=false");
if (!isSha(approval.plan_id)) fail("exact_execute_command_plan_id_valid=false");
if (!isSha(approval.review_id)) fail("exact_execute_command_review_id_valid=false");
if (!isSha(approval.request_id)) fail("exact_execute_command_request_id_valid=false");

if (!(approval.selected_type === "operator_published" || approval.selected_type === "mirrored")) fail("exact_execute_command_selected_type_valid=false");
if (!safeId(approval.dataset_id)) fail("exact_execute_command_dataset_id_safe=false");
if (approval.selected_type === "mirrored" && !safeId(approval.mirror_node_label)) fail("exact_execute_command_mirror_node_label_safe=false");
if (!isSha(approval.manifest_sha256)) fail("exact_execute_command_manifest_sha256_valid=false");
if (!isSha(approval.content_root_sha256)) fail("exact_execute_command_content_root_sha256_valid=false");
if (Number(approval.object_count) <= 0) fail("exact_execute_command_object_count_valid=false");
if (Number(approval.total_bytes) < 0) fail("exact_execute_command_total_bytes_valid=false");

const preflight = approval.approved_preflight || {};
if (preflight.final_preflight_valid !== true) fail("exact_execute_command_final_preflight_valid=false");
if (preflight.preflight_id_hash_verified !== true) fail("exact_execute_command_preflight_id_hash_verified=false");
if (preflight.dry_run_plan_valid !== true) fail("exact_execute_command_dry_run_plan_valid=false");
if (preflight.plan_id_hash_verified !== true) fail("exact_execute_command_plan_id_hash_verified=false");
if (preflight.review_id_hash_verified !== true) fail("exact_execute_command_review_id_hash_verified=false");
if (preflight.request_id_hash_verified !== true) fail("exact_execute_command_request_id_hash_verified=false");
if (preflight.duplicate_local_availability_check_performed !== true) fail("exact_execute_command_duplicate_check_performed=false");
if (preflight.source_peer_reachable !== true) fail("exact_execute_command_source_peer_reachable=false");
if (preflight.final_peer_content_verify_green !== true) fail("exact_execute_command_final_peer_content_verify_green=false");

const gate = approval.operator_gate || {};
if (gate.explicit_operator_approval_recorded_now !== true) fail("exact_execute_command_operator_approval_recorded=false");
if (gate.operator_approved_for_next_execute_review_packet !== true) fail("exact_execute_command_operator_approved_for_next_packet=false");
if (gate.execution_allowed_now !== false) fail("exact_execute_command_approval_execution_allowed_now_not_false");
if (gate.execute_packet_created_now !== false) fail("exact_execute_command_approval_execute_packet_created_now_not_false");
if (gate.command_rendered_now !== false) fail("exact_execute_command_approval_command_rendered_now_not_false");
if (gate.command_executed_now !== false) fail("exact_execute_command_approval_command_executed_now_not_false");
if (gate.mirror_executed_now !== false) fail("exact_execute_command_approval_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("exact_execute_command_approval_pin_executed_now_not_false");

const required = approval.required_after_approval_before_execution || {};
if (required.pre_execution_backup_required !== true) fail("exact_execute_command_backup_required=false");
if (required.backup_created_now !== false) fail("exact_execute_command_backup_created_now_not_false");
if (required.final_command_review_required !== true) fail("exact_execute_command_final_command_review_required=false");
if (required.exact_execute_command_packet_required !== true) fail("exact_execute_command_packet_required=false");
if (required.operator_terminal_execute_required !== true) fail("exact_execute_command_terminal_execute_required=false");
if (required.final_runtime_duplicate_guard_required !== true) fail("exact_execute_command_runtime_duplicate_guard_required=false");

const safety = approval.public_safety || {};
if (safety.approval_packet_public_safe !== true) fail("exact_execute_command_approval_packet_public_safe=false");
if (safety.public_mutation !== false) fail("exact_execute_command_approval_public_mutation_not_false");
if (safety.ledger_write !== false) fail("exact_execute_command_approval_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("exact_execute_command_approval_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("exact_execute_command_approval_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("exact_execute_command_approval_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("exact_execute_command_approval_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("exact_execute_command_approval_local_storage_root_disclosed_not_false");

const targetMirrorNodeLabel = ("pin-" + executeOperatorLabel + "-" + approval.dataset_id)
  .replace(/[^a-zA-Z0-9._-]/g, "-")
  .slice(0, 96);

const selectedType = approval.selected_type;
const currentExecutorSupportsSelectedType = selectedType === "operator_published";

const exactArgv = currentExecutorSupportsSelectedType
  ? [
      "env",
      `BASE=${sourcePeerBase}`,
      `DATASET_ID=${approval.dataset_id}`,
      `MIRROR_NODE_LABEL=${targetMirrorNodeLabel}`,
      "ops/mainnet0/datanet-core-mirror-loop-v1.sh"
    ]
  : [];

const exactCommand = exactArgv.length > 0
  ? exactArgv.map((part) => `'${String(part).replace(/'/g, `'\\''`)}'`).join(" ")
  : null;

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_V1",
  version: 1,
  ok: true,
  command_packet_state: currentExecutorSupportsSelectedType
    ? "exact_command_rendered_not_executed"
    : "exact_command_blocked_executor_gap_not_executed",
  command_scope: "execute_command_packet_only_no_execution",
  execute_operator_label: executeOperatorLabel,
  source_peer_base: sourcePeerBase,
  approval_id: approval.approval_id,
  preflight_id: approval.preflight_id,
  plan_id: approval.plan_id,
  review_id: approval.review_id,
  request_id: approval.request_id,
  selected_type: selectedType,
  dataset_id: approval.dataset_id,
  mirror_node_label: selectedType === "mirrored" ? approval.mirror_node_label : null,
  manifest_sha256: approval.manifest_sha256,
  content_root_sha256: approval.content_root_sha256,
  object_count: approval.object_count,
  total_bytes: approval.total_bytes,
  target_mirror_node_label: targetMirrorNodeLabel,
  approval_validation: {
    approval_packet_valid: true,
    approval_id_hash_verified: true,
    final_preflight_valid: true,
    preflight_id_hash_verified: true,
    dry_run_plan_valid: true,
    plan_id_hash_verified: true,
    review_id_hash_verified: true,
    request_id_hash_verified: true,
    duplicate_local_availability_check_performed: true,
    source_peer_reachable: true,
    final_peer_content_verify_green: true,
    explicit_operator_approval_recorded_now: true
  },
  exact_execute_command: {
    current_executor_supports_selected_type: currentExecutorSupportsSelectedType,
    selected_type_supported_by_current_mirror_loop: currentExecutorSupportsSelectedType,
    mirrored_source_executor_required: selectedType === "mirrored",
    command_family: currentExecutorSupportsSelectedType ? "datanet-core-mirror-loop-v1.sh" : null,
    command_rendered_now: currentExecutorSupportsSelectedType,
    command_argv: exactArgv,
    command_string: exactCommand,
    command_executed_now: false
  },
  required_after_command_packet_before_execution: {
    final_command_review_required: true,
    pre_execution_backup_required: true,
    backup_created_now: false,
    final_runtime_duplicate_guard_required: true,
    operator_terminal_execute_required: true,
    execute_packet_must_be_rechecked_before_run: true
  },
  operator_gate: {
    operator_approval_recorded_now: true,
    exact_execute_command_packet_created_now: true,
    execution_allowed_now: false,
    command_executed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false
  },
  public_safety: {
    exact_command_packet_public_safe: true,
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

fs.writeFileSync(outFile, JSON.stringify(packet, null, 2) + "\n");

console.log("exact_execute_command_approval_marker_valid=true");
console.log("exact_execute_command_approval_id_hash_verified=true");
console.log("exact_execute_command_final_preflight_valid=true");
console.log("exact_execute_command_preflight_id_hash_verified=true");
console.log("exact_execute_command_plan_id_hash_verified=true");
console.log("exact_execute_command_review_id_hash_verified=true");
console.log("exact_execute_command_request_id_hash_verified=true");
console.log("exact_execute_command_duplicate_local_availability_check_performed=true");
console.log("exact_execute_command_source_peer_reachable=true");
console.log("exact_execute_command_final_peer_content_verify_green=true");
console.log("exact_execute_command_operator_approval_recorded_now=true");
console.log("exact_execute_command_selected_type=" + selectedType);
console.log("exact_execute_command_current_executor_supports_selected_type=" + String(currentExecutorSupportsSelectedType));
console.log("exact_execute_command_mirrored_source_executor_required=" + String(selectedType === "mirrored"));
console.log("exact_execute_command_rendered_now=" + String(currentExecutorSupportsSelectedType));
console.log("exact_execute_command_executed_now=false");
console.log("exact_execute_command_execution_allowed_now=false");
console.log("exact_execute_command_mirror_executed_now=false");
console.log("exact_execute_command_pin_executed_now=false");
console.log("exact_execute_command_public_mutation=false");
console.log("exact_execute_command_ledger_write=false");
console.log("exact_execute_command_wc_credit_award=false");
NODE

COMMAND_PACKET_ID="$(sha256sum "$OUT_DIR/exact-command.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/exact-command.nohash.json" "$OUT_DIR/exact-execute-command-packet.json" "$COMMAND_PACKET_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const commandPacketId = process.argv[4];

const packet = JSON.parse(fs.readFileSync(input, "utf8"));
packet.command_packet_id = commandPacketId;
packet.command_packet_id_scope = "sha256 over exact execute command packet without command_packet_id fields";

fs.writeFileSync(output, JSON.stringify(packet, null, 2) + "\n");
NODE

node - "$OUT_DIR/exact-execute-command-packet.json" <<'NODE'
const fs = require("node:fs");
const packet = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_V1") fail("exact_execute_command_marker_valid=false");
if (packet.ok !== true) fail("exact_execute_command_ok=false");
if (!isSha(packet.command_packet_id)) fail("exact_execute_command_packet_id_valid=false");
if (packet.command_scope !== "execute_command_packet_only_no_execution") fail("exact_execute_command_scope_valid=false");

const validation = packet.approval_validation || {};
if (validation.approval_packet_valid !== true) fail("exact_execute_command_approval_packet_valid=false");
if (validation.approval_id_hash_verified !== true) fail("exact_execute_command_approval_id_hash_verified=false");
if (validation.final_preflight_valid !== true) fail("exact_execute_command_final_preflight_valid=false");
if (validation.preflight_id_hash_verified !== true) fail("exact_execute_command_preflight_id_hash_verified=false");
if (validation.plan_id_hash_verified !== true) fail("exact_execute_command_plan_id_hash_verified=false");
if (validation.review_id_hash_verified !== true) fail("exact_execute_command_review_id_hash_verified=false");
if (validation.request_id_hash_verified !== true) fail("exact_execute_command_request_id_hash_verified=false");
if (validation.duplicate_local_availability_check_performed !== true) fail("exact_execute_command_duplicate_check_performed=false");
if (validation.source_peer_reachable !== true) fail("exact_execute_command_source_peer_reachable=false");
if (validation.final_peer_content_verify_green !== true) fail("exact_execute_command_final_verify_green=false");
if (validation.explicit_operator_approval_recorded_now !== true) fail("exact_execute_command_operator_approval_recorded=false");

const command = packet.exact_execute_command || {};
if (packet.selected_type === "operator_published") {
  if (command.current_executor_supports_selected_type !== true) fail("exact_execute_command_published_supported=false");
  if (command.command_rendered_now !== true) fail("exact_execute_command_published_rendered=false");
  if (!Array.isArray(command.command_argv) || command.command_argv.length === 0) fail("exact_execute_command_argv_present=false");
  if (typeof command.command_string !== "string" || command.command_string.length === 0) fail("exact_execute_command_string_present=false");
} else if (packet.selected_type === "mirrored") {
  if (command.current_executor_supports_selected_type !== false) fail("exact_execute_command_mirrored_supported_not_false");
  if (command.mirrored_source_executor_required !== true) fail("exact_execute_command_mirrored_executor_required=false");
  if (command.command_rendered_now !== false) fail("exact_execute_command_mirrored_command_rendered_not_false");
} else {
  fail("exact_execute_command_selected_type_valid=false");
}

if (command.command_executed_now !== false) fail("exact_execute_command_command_executed_now_not_false");

const gate = packet.operator_gate || {};
if (gate.operator_approval_recorded_now !== true) fail("exact_execute_command_operator_approval_recorded_now=false");
if (gate.exact_execute_command_packet_created_now !== true) fail("exact_execute_command_packet_created_now=false");
if (gate.execution_allowed_now !== false) fail("exact_execute_command_execution_allowed_now_not_false");
if (gate.command_executed_now !== false) fail("exact_execute_command_gate_command_executed_now_not_false");
if (gate.mirror_executed_now !== false) fail("exact_execute_command_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("exact_execute_command_pin_executed_now_not_false");

const required = packet.required_after_command_packet_before_execution || {};
if (required.final_command_review_required !== true) fail("exact_execute_command_final_command_review_required=false");
if (required.pre_execution_backup_required !== true) fail("exact_execute_command_backup_required=false");
if (required.backup_created_now !== false) fail("exact_execute_command_backup_created_now_not_false");
if (required.final_runtime_duplicate_guard_required !== true) fail("exact_execute_command_runtime_duplicate_guard_required=false");
if (required.operator_terminal_execute_required !== true) fail("exact_execute_command_terminal_execute_required=false");
if (required.execute_packet_must_be_rechecked_before_run !== true) fail("exact_execute_command_recheck_required=false");

const safety = packet.public_safety || {};
if (safety.exact_command_packet_public_safe !== true) fail("exact_execute_command_packet_public_safe=false");
if (safety.public_post_upload !== false) fail("exact_execute_command_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("exact_execute_command_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("exact_execute_command_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("exact_execute_command_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("exact_execute_command_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("exact_execute_command_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("exact_execute_command_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("exact_execute_command_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("exact_execute_command_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("exact_execute_command_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("exact_execute_command_local_storage_root_disclosed_not_false");

console.log("exact_execute_command_marker_valid=true");
console.log("exact_execute_command_packet_id_valid=true");
console.log("exact_execute_command_packet_created=true");
console.log("exact_execute_command_selected_type=" + packet.selected_type);
console.log("exact_execute_command_current_executor_supports_selected_type=" + String(command.current_executor_supports_selected_type));
console.log("exact_execute_command_mirrored_source_executor_required=" + String(command.mirrored_source_executor_required === true));
console.log("exact_execute_command_rendered_now=" + String(command.command_rendered_now));
console.log("exact_execute_command_executed_now=false");
console.log("exact_execute_command_execution_allowed_now=false");
console.log("exact_execute_command_mirror_executed_now=false");
console.log("exact_execute_command_pin_executed_now=false");
console.log("exact_execute_command_public_mutation=false");
console.log("exact_execute_command_ledger_write=false");
console.log("exact_execute_command_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/exact-execute-command-packet.json"; then
  echo "exact_execute_command_private_leak_scan_green=false"
  exit 1
fi

echo "exact_execute_command_packet_path=$OUT_DIR/exact-execute-command-packet.json"
echo "exact_execute_command_packet_id=$COMMAND_PACKET_ID"
echo "exact_execute_command_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_V1_GREEN"
