#!/usr/bin/env bash
set -euo pipefail

TERMINAL_RELEASE_RECORD_FILE="${TERMINAL_RELEASE_RECORD_FILE:-}"
COMMAND_DISCLOSURE_OPERATOR_LABEL="${COMMAND_DISCLOSURE_OPERATOR_LABEL:-void-command-disclosure-readiness-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-command-disclosure-readiness-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$TERMINAL_RELEASE_RECORD_FILE" ]; then
  echo "command_disclosure_readiness_terminal_release_record_file_required=false"
  exit 1
fi

if [ ! -f "$TERMINAL_RELEASE_RECORD_FILE" ]; then
  echo "command_disclosure_readiness_terminal_release_record_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$TERMINAL_RELEASE_RECORD_FILE" "$OUT_DIR/terminal-release-record.json"

echo "VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_V1"
echo "command_disclosure_operator_label=$COMMAND_DISCLOSURE_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/terminal-release-record.json" "$OUT_DIR/command-disclosure-readiness.json" "$COMMAND_DISCLOSURE_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const recordFile = process.argv[2];
const outputFile = process.argv[3];
const operatorLabel = process.argv[4];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("command_disclosure_readiness_operator_label_safe=false");

const record = JSON.parse(fs.readFileSync(recordFile, "utf8"));

if (record.marker !== "VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_V1") fail("command_disclosure_readiness_record_marker_valid=false");
if (record.ok !== true) fail("command_disclosure_readiness_record_ok=false");
if (record.terminal_release_record_state !== "terminal_release_recorded_command_still_withheld_execution_not_performed") fail("command_disclosure_readiness_record_state_valid=false");
if (!isSha(record.terminal_release_record_id)) fail("command_disclosure_readiness_record_id_valid=false");

const recordCopy = JSON.parse(JSON.stringify(record));
const recordId = recordCopy.terminal_release_record_id;
delete recordCopy.terminal_release_record_id;
delete recordCopy.terminal_release_record_id_scope;
if (hash(JSON.stringify(recordCopy, null, 2) + "\n") !== recordId) {
  fail("command_disclosure_readiness_record_id_hash_verified=false");
}

if (record.terminal_release_boundary.operator_release_approval_packet_valid !== true) fail("command_disclosure_readiness_approval_packet_valid=false");
if (record.terminal_release_boundary.operator_release_approval_id_hash_verified !== true) fail("command_disclosure_readiness_approval_id_hash_verified=false");
if (record.terminal_release_boundary.operator_release_approved_now !== true) fail("command_disclosure_readiness_approved_now=false");
if (record.terminal_release_boundary.terminal_release_recorded_now !== true) fail("command_disclosure_readiness_terminal_release_recorded_now=false");
if (record.terminal_release_boundary.final_execute_released_now !== true) fail("command_disclosure_readiness_final_execute_released_now=false");
if (record.terminal_release_boundary.command_disclosure_still_required !== true) fail("command_disclosure_readiness_command_disclosure_still_required=false");
if (record.terminal_release_boundary.final_execute_allowed_now !== false) fail("command_disclosure_readiness_prior_final_execute_allowed_now_not_false");
if (record.terminal_release_boundary.terminal_execute_allowed_now !== false) fail("command_disclosure_readiness_prior_terminal_execute_allowed_now_not_false");

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
  if (record.execution_gate[key] !== false) fail(`command_disclosure_readiness_record_${key}_not_false`);
}

if (record.command_disclosure_gate.exact_command_revealed_now !== false) fail("command_disclosure_readiness_prior_exact_command_revealed_now_not_false");
if (record.command_disclosure_gate.exact_command_printed_now !== false) fail("command_disclosure_readiness_prior_exact_command_printed_now_not_false");
if (record.command_disclosure_gate.command_string_disclosed !== false) fail("command_disclosure_readiness_prior_command_string_disclosed_not_false");
if (record.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("command_disclosure_readiness_command_packet_referenced_by_id=false");

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
  if (record.public_safety[key] !== false) fail(`command_disclosure_readiness_record_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_V1",
  version: 1,
  ok: true,
  command_disclosure_readiness_state: "command_disclosure_ready_command_still_withheld_execution_not_performed",
  command_disclosure_operator_label: operatorLabel,
  terminal_release_record_id: record.terminal_release_record_id,
  operator_release_approval_id: record.operator_release_approval_id,
  operator_release_review_id: record.operator_release_review_id,
  operator_release_request_id: record.operator_release_request_id,
  final_execute_hold_id: record.final_execute_hold_id,
  final_execute_readiness_id: record.final_execute_readiness_id,
  backup_restore_readiness_id: record.backup_restore_readiness_id,
  backup_snapshot_id: record.backup_snapshot_id,
  pre_execution_backup_id: record.pre_execution_backup_id,
  manual_execute_id: record.manual_execute_id,
  terminal_execute_review_id: record.terminal_execute_review_id,
  runtime_duplicate_guard_id: record.runtime_duplicate_guard_id,
  command_packet_id: record.command_packet_id,
  selected_type: record.selected_type,
  dataset_id: record.dataset_id,
  mirror_node_label: record.mirror_node_label || null,
  target_mirror_node_label: record.target_mirror_node_label,
  manifest_sha256: record.manifest_sha256,
  content_root_sha256: record.content_root_sha256,
  object_count: record.object_count,
  total_bytes: record.total_bytes,
  command_disclosure_readiness_boundary: {
    terminal_release_record_packet_valid: true,
    terminal_release_record_id_hash_verified: true,
    operator_release_approved_now: true,
    terminal_release_recorded_now: true,
    final_execute_released_now: true,
    command_disclosure_still_required: true,
    command_disclosure_readiness_created_now: true,
    exact_command_reveal_allowed_later_by_operator_only: true,
    exact_command_revealed_now: false,
    exact_command_printed_now: false,
    command_string_disclosed: false,
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
    command_disclosure_readiness_packet_public_safe: true,
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

packet.command_disclosure_readiness_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.command_disclosure_readiness_id_scope = "sha256 over command disclosure readiness packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("command_disclosure_readiness_record_marker_valid=true");
console.log("command_disclosure_readiness_record_id_hash_verified=true");
console.log("command_disclosure_readiness_approved_now=true");
console.log("command_disclosure_readiness_terminal_release_recorded_now=true");
console.log("command_disclosure_readiness_final_execute_released_now=true");
console.log("command_disclosure_readiness_created_now=true");
console.log("command_disclosure_readiness_exact_command_revealed_now=false");
console.log("command_disclosure_readiness_exact_command_printed_now=false");
console.log("command_disclosure_readiness_command_string_disclosed=false");
console.log("command_disclosure_readiness_final_execute_allowed_now=false");
console.log("command_disclosure_readiness_terminal_execute_allowed_now=false");
console.log("command_disclosure_readiness_command_executed_now=false");
console.log("command_disclosure_readiness_mirror_executed_now=false");
console.log("command_disclosure_readiness_pin_executed_now=false");
console.log("command_disclosure_readiness_public_mutation=false");
console.log("command_disclosure_readiness_ledger_write=false");
console.log("command_disclosure_readiness_wc_credit_award=false");
console.log("command_disclosure_readiness_id=" + packet.command_disclosure_readiness_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/command-disclosure-readiness.json"; then
  echo "command_disclosure_readiness_private_leak_scan_green=false"
  exit 1
fi

echo "command_disclosure_readiness_packet_path=$OUT_DIR/command-disclosure-readiness.json"
echo "command_disclosure_readiness_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_V1_GREEN"
