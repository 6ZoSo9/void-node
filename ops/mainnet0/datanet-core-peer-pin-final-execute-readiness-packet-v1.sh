#!/usr/bin/env bash
set -euo pipefail

RESTORE_READINESS_FILE="${RESTORE_READINESS_FILE:-}"
FINAL_EXECUTE_OPERATOR_LABEL="${FINAL_EXECUTE_OPERATOR_LABEL:-void-final-execute-readiness-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-final-execute-readiness-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$RESTORE_READINESS_FILE" ]; then
  echo "final_execute_readiness_restore_readiness_file_required=false"
  exit 1
fi

if [ ! -f "$RESTORE_READINESS_FILE" ]; then
  echo "final_execute_readiness_restore_readiness_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$RESTORE_READINESS_FILE" "$OUT_DIR/backup-restore-readiness.json"

echo "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_V1"
echo "final_execute_operator_label=$FINAL_EXECUTE_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/backup-restore-readiness.json" "$OUT_DIR/final-execute-readiness.json" "$FINAL_EXECUTE_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const restoreReadinessFile = process.argv[2];
const outputFile = process.argv[3];
const operatorLabel = process.argv[4];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("final_execute_readiness_operator_label_safe=false");

const restore = JSON.parse(fs.readFileSync(restoreReadinessFile, "utf8"));

if (restore.marker !== "VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_V1") fail("final_execute_readiness_restore_marker_valid=false");
if (restore.ok !== true) fail("final_execute_readiness_restore_ok=false");
if (restore.backup_restore_readiness_state !== "restore_readiness_packet_created_no_restore_no_execution") fail("final_execute_readiness_restore_state_valid=false");
if (!isSha(restore.backup_restore_readiness_id)) fail("final_execute_readiness_restore_id_valid=false");

const restoreCopy = JSON.parse(JSON.stringify(restore));
const restoreId = restoreCopy.backup_restore_readiness_id;
delete restoreCopy.backup_restore_readiness_id;
delete restoreCopy.backup_restore_readiness_id_scope;
if (hash(JSON.stringify(restoreCopy, null, 2) + "\n") !== restoreId) {
  fail("final_execute_readiness_restore_id_hash_verified=false");
}

const boundary = restore.restore_boundary || {};
if (boundary.restore_readiness_required_before_live_execute !== true) fail("final_execute_readiness_restore_required_before_live_execute=false");
if (boundary.backup_snapshot_packet_valid !== true) fail("final_execute_readiness_backup_snapshot_packet_valid=false");
if (boundary.backup_snapshot_id_hash_verified !== true) fail("final_execute_readiness_backup_snapshot_id_hash_verified=false");
if (boundary.backup_snapshot_manifest_valid !== true) fail("final_execute_readiness_backup_snapshot_manifest_valid=false");
if (boundary.backup_snapshot_manifest_hash_verified !== true) fail("final_execute_readiness_backup_snapshot_manifest_hash_verified=false");
if (boundary.pre_execution_backup_packet_valid !== true) fail("final_execute_readiness_pre_execution_backup_packet_valid=false");
if (boundary.command_packet_referenced_by_id !== true) fail("final_execute_readiness_command_packet_referenced_by_id=false");
if (boundary.restore_plan_created_now !== true) fail("final_execute_readiness_restore_plan_created_now=false");
if (boundary.backup_restore_executed_now !== false) fail("final_execute_readiness_backup_restore_executed_now_not_false");
if (boundary.storage_snapshot_restored_now !== false) fail("final_execute_readiness_storage_snapshot_restored_now_not_false");
if (boundary.live_state_changed_now !== false) fail("final_execute_readiness_live_state_changed_now_not_false");
if (boundary.restore_path_disclosed !== false) fail("final_execute_readiness_restore_path_disclosed_not_false");

for (const key of [
  "manual_execute_allowed_now",
  "manual_execute_performed_now",
  "terminal_execute_allowed_now",
  "terminal_execute_performed_now",
  "shell_execution_performed_now",
  "command_executed_now",
  "mirror_executed_now",
  "pin_executed_now",
  "automatic_execution_allowed",
]) {
  if (restore.execution_gate[key] !== false) fail(`final_execute_readiness_restore_${key}_not_false`);
}

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
  if (restore.public_safety[key] !== false) fail(`final_execute_readiness_restore_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_V1",
  version: 1,
  ok: true,
  final_execute_readiness_state: "final_execute_readiness_packet_created_no_execution",
  final_execute_operator_label: operatorLabel,
  backup_restore_readiness_id: restore.backup_restore_readiness_id,
  backup_snapshot_id: restore.backup_snapshot_id,
  pre_execution_backup_id: restore.pre_execution_backup_id,
  manual_execute_id: restore.manual_execute_id,
  terminal_execute_review_id: restore.terminal_execute_review_id,
  runtime_duplicate_guard_id: restore.runtime_duplicate_guard_id,
  command_packet_id: restore.command_packet_id,
  selected_type: restore.selected_type,
  dataset_id: restore.dataset_id,
  mirror_node_label: restore.mirror_node_label || null,
  target_mirror_node_label: restore.target_mirror_node_label,
  manifest_sha256: restore.manifest_sha256,
  content_root_sha256: restore.content_root_sha256,
  object_count: restore.object_count,
  total_bytes: restore.total_bytes,
  readiness_chain: {
    restore_readiness_packet_valid: true,
    restore_readiness_id_hash_verified: true,
    restore_readiness_required_before_live_execute: true,
    backup_snapshot_packet_valid: true,
    backup_snapshot_id_hash_verified: true,
    backup_snapshot_manifest_valid: true,
    backup_snapshot_manifest_hash_verified: true,
    pre_execution_backup_packet_valid: true,
    manual_execute_packet_referenced_by_id: true,
    terminal_execute_review_packet_referenced_by_id: true,
    runtime_duplicate_guard_referenced_by_id: true,
    command_packet_referenced_by_id: true,
    restore_plan_created_now: true,
    final_execute_readiness_created_now: true
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
    final_execute_readiness_packet_public_safe: true,
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

packet.final_execute_readiness_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.final_execute_readiness_id_scope = "sha256 over final execute readiness packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("final_execute_readiness_restore_marker_valid=true");
console.log("final_execute_readiness_restore_id_hash_verified=true");
console.log("final_execute_readiness_restore_required_before_live_execute=true");
console.log("final_execute_readiness_backup_snapshot_packet_valid=true");
console.log("final_execute_readiness_pre_execution_backup_packet_valid=true");
console.log("final_execute_readiness_command_packet_referenced_by_id=true");
console.log("final_execute_readiness_restore_plan_created_now=true");
console.log("final_execute_readiness_created_now=true");
console.log("final_execute_readiness_final_execute_allowed_now=false");
console.log("final_execute_readiness_manual_execute_allowed_now=false");
console.log("final_execute_readiness_manual_execute_performed_now=false");
console.log("final_execute_readiness_terminal_execute_allowed_now=false");
console.log("final_execute_readiness_terminal_execute_performed_now=false");
console.log("final_execute_readiness_shell_execution_performed_now=false");
console.log("final_execute_readiness_command_executed_now=false");
console.log("final_execute_readiness_mirror_executed_now=false");
console.log("final_execute_readiness_pin_executed_now=false");
console.log("final_execute_readiness_backup_restore_executed_now=false");
console.log("final_execute_readiness_storage_snapshot_restored_now=false");
console.log("final_execute_readiness_public_mutation=false");
console.log("final_execute_readiness_ledger_write=false");
console.log("final_execute_readiness_wc_credit_award=false");
console.log("final_execute_readiness_exact_command_revealed_now=false");
console.log("final_execute_readiness_exact_command_printed_now=false");
console.log("final_execute_readiness_command_string_disclosed=false");
console.log("final_execute_readiness_id=" + packet.final_execute_readiness_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/final-execute-readiness.json"; then
  echo "final_execute_readiness_private_leak_scan_green=false"
  exit 1
fi

echo "final_execute_readiness_packet_path=$OUT_DIR/final-execute-readiness.json"
echo "final_execute_readiness_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_V1_GREEN"
