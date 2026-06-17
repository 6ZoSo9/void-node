#!/usr/bin/env bash
set -euo pipefail

OPERATOR_RELEASE_APPROVAL_FILE="${OPERATOR_RELEASE_APPROVAL_FILE:-}"
TERMINAL_RELEASE_OPERATOR_LABEL="${TERMINAL_RELEASE_OPERATOR_LABEL:-void-terminal-release-record-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-terminal-release-record-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$OPERATOR_RELEASE_APPROVAL_FILE" ]; then
  echo "terminal_release_record_approval_file_required=false"
  exit 1
fi

if [ ! -f "$OPERATOR_RELEASE_APPROVAL_FILE" ]; then
  echo "terminal_release_record_approval_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$OPERATOR_RELEASE_APPROVAL_FILE" "$OUT_DIR/operator-release-approval.json"

echo "VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_V1"
echo "terminal_release_operator_label=$TERMINAL_RELEASE_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/operator-release-approval.json" "$OUT_DIR/terminal-release-record.json" "$TERMINAL_RELEASE_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const approvalFile = process.argv[2];
const outputFile = process.argv[3];
const operatorLabel = process.argv[4];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("terminal_release_record_operator_label_safe=false");

const approval = JSON.parse(fs.readFileSync(approvalFile, "utf8"));

if (approval.marker !== "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_V1") fail("terminal_release_record_approval_marker_valid=false");
if (approval.ok !== true) fail("terminal_release_record_approval_ok=false");
if (approval.operator_release_approval_state !== "operator_release_approved_terminal_release_still_required") fail("terminal_release_record_approval_state_valid=false");
if (!isSha(approval.operator_release_approval_id)) fail("terminal_release_record_approval_id_valid=false");

const approvalCopy = JSON.parse(JSON.stringify(approval));
const approvalId = approvalCopy.operator_release_approval_id;
delete approvalCopy.operator_release_approval_id;
delete approvalCopy.operator_release_approval_id_scope;
if (hash(JSON.stringify(approvalCopy, null, 2) + "\n") !== approvalId) {
  fail("terminal_release_record_approval_id_hash_verified=false");
}

if (approval.release_approval_boundary.operator_release_review_packet_valid !== true) fail("terminal_release_record_review_packet_valid=false");
if (approval.release_approval_boundary.operator_release_review_id_hash_verified !== true) fail("terminal_release_record_review_id_hash_verified=false");
if (approval.release_approval_boundary.operator_release_request_recorded_now !== true) fail("terminal_release_record_request_recorded_now=false");
if (approval.release_approval_boundary.operator_release_review_performed_now !== true) fail("terminal_release_record_review_performed_now=false");
if (approval.release_approval_boundary.operator_release_approved_now !== true) fail("terminal_release_record_approved_now=false");
if (approval.release_approval_boundary.terminal_release_still_required !== true) fail("terminal_release_record_terminal_release_still_required=false");
if (approval.release_approval_boundary.final_execute_released_now !== false) fail("terminal_release_record_prior_final_execute_released_now_not_false");
if (approval.release_approval_boundary.terminal_release_recorded_now !== false) fail("terminal_release_record_prior_terminal_release_recorded_now_not_false");
if (approval.release_approval_boundary.final_execute_allowed_now !== false) fail("terminal_release_record_prior_final_execute_allowed_now_not_false");

for (const key of [
  "final_execute_allowed_now",
  "manual_execute_allowed_now",
  "manual_execute_performed_now",
  "terminal_execute_allowed_now",
  "terminal_execute_performed_now",
  "shell_execution_performed_now",
  "command_executed_now",
  "mirror_executed_now",
  "pin_executed_now",
  "backup_restore_executed_now",
  "storage_snapshot_restored_now",
  "live_state_changed_now",
  "automatic_execution_allowed",
]) {
  if (approval.execution_gate[key] !== false) fail(`terminal_release_record_approval_${key}_not_false`);
}

if (approval.command_disclosure_gate.exact_command_revealed_now !== false) fail("terminal_release_record_exact_command_revealed_now_not_false");
if (approval.command_disclosure_gate.exact_command_printed_now !== false) fail("terminal_release_record_exact_command_printed_now_not_false");
if (approval.command_disclosure_gate.command_string_disclosed !== false) fail("terminal_release_record_command_string_disclosed_not_false");
if (approval.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("terminal_release_record_command_packet_referenced_by_id=false");

for (const key of [
  "public_shell_execution",
  "public_mutation",
  "automatic_mirror",
  "automatic_pin",
  "ledger_write",
  "wc_credit_award",
  "command_string_disclosed",
  "local_path_disclosed",
  "backup_path_disclosed",
  "restore_path_disclosed",
  "absolute_path_disclosed",
  "operator_home_path_disclosed",
  "local_storage_root_disclosed",
]) {
  if (approval.public_safety[key] !== false) fail(`terminal_release_record_approval_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_V1",
  version: 1,
  ok: true,
  terminal_release_record_state: "terminal_release_recorded_command_still_withheld_execution_not_performed",
  terminal_release_operator_label: operatorLabel,
  operator_release_approval_id: approval.operator_release_approval_id,
  operator_release_review_id: approval.operator_release_review_id,
  operator_release_request_id: approval.operator_release_request_id,
  final_execute_hold_id: approval.final_execute_hold_id,
  final_execute_readiness_id: approval.final_execute_readiness_id,
  backup_restore_readiness_id: approval.backup_restore_readiness_id,
  backup_snapshot_id: approval.backup_snapshot_id,
  pre_execution_backup_id: approval.pre_execution_backup_id,
  manual_execute_id: approval.manual_execute_id,
  terminal_execute_review_id: approval.terminal_execute_review_id,
  runtime_duplicate_guard_id: approval.runtime_duplicate_guard_id,
  command_packet_id: approval.command_packet_id,
  selected_type: approval.selected_type,
  dataset_id: approval.dataset_id,
  mirror_node_label: approval.mirror_node_label || null,
  target_mirror_node_label: approval.target_mirror_node_label,
  manifest_sha256: approval.manifest_sha256,
  content_root_sha256: approval.content_root_sha256,
  object_count: approval.object_count,
  total_bytes: approval.total_bytes,
  terminal_release_boundary: {
    operator_release_approval_packet_valid: true,
    operator_release_approval_id_hash_verified: true,
    operator_release_request_recorded_now: true,
    operator_release_review_performed_now: true,
    operator_release_approved_now: true,
    terminal_release_recorded_now: true,
    final_execute_released_now: true,
    command_disclosure_still_required: true,
    final_execute_allowed_now: false,
    terminal_execute_allowed_now: false
  },
  execution_gate: {
    final_execute_allowed_now: false,
    manual_execute_allowed_now: false,
    manual_execute_performed_now: false,
    terminal_execute_allowed_now: false,
    terminal_execute_performed_now: false,
    shell_execution_performed_now: false,
    command_executed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false,
    backup_restore_executed_now: false,
    storage_snapshot_restored_now: false,
    live_state_changed_now: false,
    automatic_execution_allowed: false
  },
  command_disclosure_gate: {
    exact_command_revealed_now: false,
    exact_command_printed_now: false,
    command_string_disclosed: false,
    command_packet_referenced_by_id: true
  },
  public_safety: {
    terminal_release_record_packet_public_safe: true,
    public_shell_execution: false,
    public_mutation: false,
    automatic_mirror: false,
    automatic_pin: false,
    ledger_write: false,
    wc_credit_award: false,
    command_string_disclosed: false,
    local_path_disclosed: false,
    backup_path_disclosed: false,
    restore_path_disclosed: false,
    absolute_path_disclosed: false,
    operator_home_path_disclosed: false,
    local_storage_root_disclosed: false
  }
};

packet.terminal_release_record_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.terminal_release_record_id_scope = "sha256 over terminal release record packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("terminal_release_record_approval_marker_valid=true");
console.log("terminal_release_record_approval_id_hash_verified=true");
console.log("terminal_release_record_request_recorded_now=true");
console.log("terminal_release_record_review_performed_now=true");
console.log("terminal_release_record_approved_now=true");
console.log("terminal_release_record_recorded_now=true");
console.log("terminal_release_record_final_execute_released_now=true");
console.log("terminal_release_record_command_disclosure_still_required=true");
console.log("terminal_release_record_final_execute_allowed_now=false");
console.log("terminal_release_record_terminal_execute_allowed_now=false");
console.log("terminal_release_record_command_executed_now=false");
console.log("terminal_release_record_mirror_executed_now=false");
console.log("terminal_release_record_pin_executed_now=false");
console.log("terminal_release_record_public_mutation=false");
console.log("terminal_release_record_ledger_write=false");
console.log("terminal_release_record_wc_credit_award=false");
console.log("terminal_release_record_exact_command_revealed_now=false");
console.log("terminal_release_record_exact_command_printed_now=false");
console.log("terminal_release_record_command_string_disclosed=false");
console.log("terminal_release_record_id=" + packet.terminal_release_record_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/terminal-release-record.json"; then
  echo "terminal_release_record_private_leak_scan_green=false"
  exit 1
fi

echo "terminal_release_record_packet_path=$OUT_DIR/terminal-release-record.json"
echo "terminal_release_record_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_V1_GREEN"
