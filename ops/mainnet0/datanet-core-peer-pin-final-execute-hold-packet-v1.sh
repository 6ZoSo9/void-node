#!/usr/bin/env bash
set -euo pipefail

FINAL_EXECUTE_READINESS_FILE="${FINAL_EXECUTE_READINESS_FILE:-}"
FINAL_EXECUTE_HOLD_OPERATOR_LABEL="${FINAL_EXECUTE_HOLD_OPERATOR_LABEL:-void-final-execute-hold-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-final-execute-hold-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$FINAL_EXECUTE_READINESS_FILE" ]; then
  echo "final_execute_hold_readiness_file_required=false"
  exit 1
fi

if [ ! -f "$FINAL_EXECUTE_READINESS_FILE" ]; then
  echo "final_execute_hold_readiness_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$FINAL_EXECUTE_READINESS_FILE" "$OUT_DIR/final-execute-readiness.json"

echo "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_V1"
echo "final_execute_hold_operator_label=$FINAL_EXECUTE_HOLD_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/final-execute-readiness.json" "$OUT_DIR/final-execute-hold.json" "$FINAL_EXECUTE_HOLD_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const readinessFile = process.argv[2];
const outputFile = process.argv[3];
const operatorLabel = process.argv[4];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("final_execute_hold_operator_label_safe=false");

const readiness = JSON.parse(fs.readFileSync(readinessFile, "utf8"));

if (readiness.marker !== "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_V1") fail("final_execute_hold_readiness_marker_valid=false");
if (readiness.ok !== true) fail("final_execute_hold_readiness_ok=false");
if (readiness.final_execute_readiness_state !== "final_execute_readiness_packet_created_no_execution") fail("final_execute_hold_readiness_state_valid=false");
if (!isSha(readiness.final_execute_readiness_id)) fail("final_execute_hold_readiness_id_valid=false");

const readinessCopy = JSON.parse(JSON.stringify(readiness));
const readinessId = readinessCopy.final_execute_readiness_id;
delete readinessCopy.final_execute_readiness_id;
delete readinessCopy.final_execute_readiness_id_scope;
if (hash(JSON.stringify(readinessCopy, null, 2) + "\n") !== readinessId) {
  fail("final_execute_hold_readiness_id_hash_verified=false");
}

for (const key of [
  "restore_readiness_packet_valid",
  "restore_readiness_id_hash_verified",
  "restore_readiness_required_before_live_execute",
  "backup_snapshot_packet_valid",
  "backup_snapshot_id_hash_verified",
  "backup_snapshot_manifest_valid",
  "backup_snapshot_manifest_hash_verified",
  "pre_execution_backup_packet_valid",
  "manual_execute_packet_referenced_by_id",
  "terminal_execute_review_packet_referenced_by_id",
  "runtime_duplicate_guard_referenced_by_id",
  "command_packet_referenced_by_id",
  "restore_plan_created_now",
  "final_execute_readiness_created_now",
]) {
  if (readiness.readiness_chain[key] !== true) fail(`final_execute_hold_readiness_chain_${key}_not_true`);
}

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
  if (readiness.execution_gate[key] !== false) fail(`final_execute_hold_readiness_${key}_not_false`);
}

if (readiness.command_disclosure_gate.exact_command_revealed_now !== false) fail("final_execute_hold_exact_command_revealed_now_not_false");
if (readiness.command_disclosure_gate.exact_command_printed_now !== false) fail("final_execute_hold_exact_command_printed_now_not_false");
if (readiness.command_disclosure_gate.command_string_disclosed !== false) fail("final_execute_hold_command_string_disclosed_not_false");
if (readiness.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("final_execute_hold_command_packet_referenced_by_id=false");

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
  if (readiness.public_safety[key] !== false) fail(`final_execute_hold_readiness_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_V1",
  version: 1,
  ok: true,
  final_execute_hold_state: "final_execute_hold_packet_created_execution_still_held",
  final_execute_hold_operator_label: operatorLabel,
  final_execute_readiness_id: readiness.final_execute_readiness_id,
  backup_restore_readiness_id: readiness.backup_restore_readiness_id,
  backup_snapshot_id: readiness.backup_snapshot_id,
  pre_execution_backup_id: readiness.pre_execution_backup_id,
  manual_execute_id: readiness.manual_execute_id,
  terminal_execute_review_id: readiness.terminal_execute_review_id,
  runtime_duplicate_guard_id: readiness.runtime_duplicate_guard_id,
  command_packet_id: readiness.command_packet_id,
  selected_type: readiness.selected_type,
  dataset_id: readiness.dataset_id,
  mirror_node_label: readiness.mirror_node_label || null,
  target_mirror_node_label: readiness.target_mirror_node_label,
  manifest_sha256: readiness.manifest_sha256,
  content_root_sha256: readiness.content_root_sha256,
  object_count: readiness.object_count,
  total_bytes: readiness.total_bytes,
  hold_boundary: {
    readiness_packet_valid: true,
    readiness_id_hash_verified: true,
    readiness_chain_complete: true,
    final_execute_hold_required: true,
    final_execute_released_now: false,
    operator_release_recorded_now: false,
    terminal_release_recorded_now: false,
    final_execute_allowed_now: false
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
    final_execute_hold_packet_public_safe: true,
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

packet.final_execute_hold_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.final_execute_hold_id_scope = "sha256 over final execute hold packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("final_execute_hold_readiness_marker_valid=true");
console.log("final_execute_hold_readiness_id_hash_verified=true");
console.log("final_execute_hold_readiness_chain_complete=true");
console.log("final_execute_hold_required=true");
console.log("final_execute_hold_final_execute_released_now=false");
console.log("final_execute_hold_operator_release_recorded_now=false");
console.log("final_execute_hold_terminal_release_recorded_now=false");
console.log("final_execute_hold_final_execute_allowed_now=false");
console.log("final_execute_hold_manual_execute_allowed_now=false");
console.log("final_execute_hold_manual_execute_performed_now=false");
console.log("final_execute_hold_terminal_execute_allowed_now=false");
console.log("final_execute_hold_terminal_execute_performed_now=false");
console.log("final_execute_hold_shell_execution_performed_now=false");
console.log("final_execute_hold_command_executed_now=false");
console.log("final_execute_hold_mirror_executed_now=false");
console.log("final_execute_hold_pin_executed_now=false");
console.log("final_execute_hold_backup_restore_executed_now=false");
console.log("final_execute_hold_storage_snapshot_restored_now=false");
console.log("final_execute_hold_public_mutation=false");
console.log("final_execute_hold_ledger_write=false");
console.log("final_execute_hold_wc_credit_award=false");
console.log("final_execute_hold_exact_command_revealed_now=false");
console.log("final_execute_hold_exact_command_printed_now=false");
console.log("final_execute_hold_command_string_disclosed=false");
console.log("final_execute_hold_id=" + packet.final_execute_hold_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/final-execute-hold.json"; then
  echo "final_execute_hold_private_leak_scan_green=false"
  exit 1
fi

echo "final_execute_hold_packet_path=$OUT_DIR/final-execute-hold.json"
echo "final_execute_hold_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_V1_GREEN"
