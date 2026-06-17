#!/usr/bin/env bash
set -euo pipefail

MANUAL_EXECUTE_FILE="${MANUAL_EXECUTE_FILE:-}"
BACKUP_OPERATOR_LABEL="${BACKUP_OPERATOR_LABEL:-void-pre-execution-backup-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-pre-execution-backup-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$MANUAL_EXECUTE_FILE" ]; then
  echo "pre_execution_backup_manual_execute_file_required=false"
  exit 1
fi

if [ ! -f "$MANUAL_EXECUTE_FILE" ]; then
  echo "pre_execution_backup_manual_execute_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$MANUAL_EXECUTE_FILE" "$OUT_DIR/manual-execute.json"

echo "VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_V1"
echo "backup_operator_label=$BACKUP_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/manual-execute.json" "$OUT_DIR/pre-execution-backup.json" "$BACKUP_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const manualFile = process.argv[2];
const outFile = process.argv[3];
const operatorLabel = process.argv[4];

const manual = JSON.parse(fs.readFileSync(manualFile, "utf8"));
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => { console.error(msg); process.exit(1); };

if (!safe(operatorLabel)) fail("pre_execution_backup_operator_label_safe=false");
if (manual.marker !== "VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_V1") fail("pre_execution_backup_manual_execute_marker_valid=false");
if (manual.ok !== true) fail("pre_execution_backup_manual_execute_ok=false");
if (!isSha(manual.manual_execute_id)) fail("pre_execution_backup_manual_execute_id_valid=false");

const manualCopy = JSON.parse(JSON.stringify(manual));
delete manualCopy.manual_execute_id;
delete manualCopy.manual_execute_id_scope;

if (hash(JSON.stringify(manualCopy, null, 2) + "\n") !== manual.manual_execute_id) {
  fail("pre_execution_backup_manual_execute_id_hash_verified=false");
}

const handling = manual.command_handling || {};
const gate = manual.manual_execute_gate || {};
const safety = manual.public_safety || {};
const required = manual.required_before_any_real_execution || {};
const duplicate = manual.final_runtime_duplicate_guard || {};
const validation = manual.terminal_review_validation || {};

if (manual.manual_execute_state !== "manual_execute_packet_created_no_terminal_execution") fail("pre_execution_backup_manual_execute_state_valid=false");
if (validation.terminal_execute_review_id_hash_verified !== true) fail("pre_execution_backup_terminal_review_id_hash_verified=false");
if (validation.runtime_duplicate_guard_id_hash_verified !== true) fail("pre_execution_backup_runtime_guard_id_hash_verified=false");
if (validation.command_packet_id_hash_verified !== true) fail("pre_execution_backup_command_packet_id_hash_verified=false");
if (duplicate.performed_now !== true) fail("pre_execution_backup_runtime_duplicate_guard_performed_now=false");
if (handling.command_packet_referenced_by_id !== true) fail("pre_execution_backup_command_packet_referenced_by_id=false");
if (handling.exact_command_revealed_now !== false) fail("pre_execution_backup_exact_command_revealed_now_not_false");
if (handling.exact_command_printed_now !== false) fail("pre_execution_backup_exact_command_printed_now_not_false");
if (handling.command_string_disclosed !== false) fail("pre_execution_backup_command_string_disclosed_not_false");
if (required.pre_execution_backup_required !== true) fail("pre_execution_backup_required_not_true");
if (required.backup_created_now !== false) fail("pre_execution_backup_prior_backup_created_now_not_false");

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
  if (gate[key] !== false) fail(`pre_execution_backup_${key}_not_false`);
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
  "absolute_path_disclosed",
  "operator_home_path_disclosed",
  "local_storage_root_disclosed"
]) {
  if (safety[key] !== false) fail(`pre_execution_backup_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_V1",
  version: 1,
  ok: true,
  backup_state: "pre_execution_backup_packet_created_no_mutation",
  backup_operator_label: operatorLabel,

  manual_execute_id: manual.manual_execute_id,
  terminal_execute_review_id: manual.terminal_execute_review_id,
  runtime_duplicate_guard_id: manual.runtime_duplicate_guard_id,
  command_packet_id: manual.command_packet_id,

  selected_type: manual.selected_type,
  dataset_id: manual.dataset_id,
  mirror_node_label: manual.selected_type === "mirrored" ? manual.mirror_node_label : null,
  target_mirror_node_label: manual.target_mirror_node_label,
  manifest_sha256: manual.manifest_sha256,
  content_root_sha256: manual.content_root_sha256,
  object_count: manual.object_count,
  total_bytes: manual.total_bytes,

  validation: {
    manual_execute_packet_valid: true,
    manual_execute_id_hash_verified: true,
    terminal_execute_review_id_hash_verified: true,
    runtime_duplicate_guard_id_hash_verified: true,
    command_packet_id_hash_verified: true,
    runtime_duplicate_guard_performed_now: true,
    command_packet_referenced_by_id: true,
    exact_command_revealed_now: false,
    exact_command_printed_now: false,
    command_string_disclosed: false
  },

  backup_gate: {
    pre_execution_backup_required: true,
    backup_packet_created_now: true,
    backup_created_now: false,
    backup_manifest_created_now: false,
    backup_storage_snapshot_created_now: false,
    backup_path_disclosed: false
  },

  execution_gate: {
    duplicate_found: duplicate.duplicate_found === true,
    mirrored_source_executor_required: handling.mirrored_source_executor_required === true,
    manual_execute_allowed_now: false,
    manual_execute_performed_now: false,
    terminal_execute_allowed_now: false,
    terminal_execute_performed_now: false,
    shell_execution_performed_now: false,
    command_executed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false,
    automatic_execution_allowed: false
  },

  public_safety: {
    pre_execution_backup_packet_public_safe: true,
    public_shell_execution: false,
    public_mutation: false,
    automatic_mirror: false,
    automatic_pin: false,
    ledger_write: false,
    wc_credit_award: false,
    command_string_disclosed: false,
    local_path_disclosed: false,
    backup_path_disclosed: false,
    absolute_path_disclosed: false,
    operator_home_path_disclosed: false,
    local_storage_root_disclosed: false
  }
};

packet.pre_execution_backup_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.pre_execution_backup_id_scope = "sha256 over pre-execution backup packet before id fields";

fs.writeFileSync(outFile, JSON.stringify(packet, null, 2) + "\n");

console.log("pre_execution_backup_manual_execute_marker_valid=true");
console.log("pre_execution_backup_manual_execute_id_hash_verified=true");
console.log("pre_execution_backup_terminal_review_id_hash_verified=true");
console.log("pre_execution_backup_runtime_guard_id_hash_verified=true");
console.log("pre_execution_backup_command_packet_id_hash_verified=true");
console.log("pre_execution_backup_runtime_duplicate_guard_performed_now=true");
console.log("pre_execution_backup_command_packet_referenced_by_id=true");
console.log("pre_execution_backup_exact_command_revealed_now=false");
console.log("pre_execution_backup_exact_command_printed_now=false");
console.log("pre_execution_backup_command_string_disclosed=false");
console.log("pre_execution_backup_required=true");
console.log("pre_execution_backup_packet_created_now=true");
console.log("pre_execution_backup_created_now=false");
console.log("pre_execution_backup_manifest_created_now=false");
console.log("pre_execution_backup_storage_snapshot_created_now=false");
console.log("pre_execution_backup_manual_execute_allowed_now=false");
console.log("pre_execution_backup_manual_execute_performed_now=false");
console.log("pre_execution_backup_terminal_execute_allowed_now=false");
console.log("pre_execution_backup_terminal_execute_performed_now=false");
console.log("pre_execution_backup_shell_execution_performed_now=false");
console.log("pre_execution_backup_command_executed_now=false");
console.log("pre_execution_backup_mirror_executed_now=false");
console.log("pre_execution_backup_pin_executed_now=false");
console.log("pre_execution_backup_public_mutation=false");
console.log("pre_execution_backup_ledger_write=false");
console.log("pre_execution_backup_wc_credit_award=false");
console.log("pre_execution_backup_id=" + packet.pre_execution_backup_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/pre-execution-backup.json"; then
  echo "pre_execution_backup_private_leak_scan_green=false"
  exit 1
fi

echo "pre_execution_backup_packet_path=$OUT_DIR/pre-execution-backup.json"
echo "pre_execution_backup_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_V1_GREEN"
