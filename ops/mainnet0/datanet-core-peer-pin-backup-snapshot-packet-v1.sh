#!/usr/bin/env bash
set -euo pipefail

PRE_EXECUTION_BACKUP_FILE="${PRE_EXECUTION_BACKUP_FILE:-}"
SNAPSHOT_OPERATOR_LABEL="${SNAPSHOT_OPERATOR_LABEL:-void-backup-snapshot-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-backup-snapshot-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$PRE_EXECUTION_BACKUP_FILE" ]; then
  echo "backup_snapshot_pre_execution_backup_file_required=false"
  exit 1
fi

if [ ! -f "$PRE_EXECUTION_BACKUP_FILE" ]; then
  echo "backup_snapshot_pre_execution_backup_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$PRE_EXECUTION_BACKUP_FILE" "$OUT_DIR/pre-execution-backup.json"

echo "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_V1"
echo "snapshot_operator_label=$SNAPSHOT_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/pre-execution-backup.json" "$OUT_DIR/backup-snapshot.json" "$SNAPSHOT_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const inputFile = process.argv[2];
const outputFile = process.argv[3];
const operatorLabel = process.argv[4];

const backup = JSON.parse(fs.readFileSync(inputFile, "utf8"));
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("backup_snapshot_operator_label_safe=false");
if (backup.marker !== "VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_V1") fail("backup_snapshot_pre_execution_backup_marker_valid=false");
if (backup.ok !== true) fail("backup_snapshot_pre_execution_backup_ok=false");
if (!isSha(backup.pre_execution_backup_id)) fail("backup_snapshot_pre_execution_backup_id_valid=false");

const backupCopy = JSON.parse(JSON.stringify(backup));
delete backupCopy.pre_execution_backup_id;
delete backupCopy.pre_execution_backup_id_scope;

if (hash(JSON.stringify(backupCopy, null, 2) + "\n") !== backup.pre_execution_backup_id) {
  fail("backup_snapshot_pre_execution_backup_id_hash_verified=false");
}

const gate = backup.backup_gate || {};
const exec = backup.execution_gate || {};
const safety = backup.public_safety || {};
const validation = backup.validation || {};

if (backup.backup_state !== "pre_execution_backup_packet_created_no_mutation") fail("backup_snapshot_pre_execution_backup_state_valid=false");
if (validation.manual_execute_id_hash_verified !== true) fail("backup_snapshot_manual_execute_id_hash_verified=false");
if (validation.command_packet_referenced_by_id !== true) fail("backup_snapshot_command_packet_referenced_by_id=false");
if (validation.exact_command_revealed_now !== false) fail("backup_snapshot_exact_command_revealed_now_not_false");
if (validation.exact_command_printed_now !== false) fail("backup_snapshot_exact_command_printed_now_not_false");
if (validation.command_string_disclosed !== false) fail("backup_snapshot_command_string_disclosed_not_false");

if (gate.pre_execution_backup_required !== true) fail("backup_snapshot_pre_execution_backup_required=false");
if (gate.backup_packet_created_now !== true) fail("backup_snapshot_prior_backup_packet_created_now=false");
if (gate.backup_created_now !== false) fail("backup_snapshot_prior_backup_created_now_not_false");
if (gate.backup_manifest_created_now !== false) fail("backup_snapshot_prior_backup_manifest_created_now_not_false");
if (gate.backup_storage_snapshot_created_now !== false) fail("backup_snapshot_prior_storage_snapshot_created_now_not_false");
if (gate.backup_path_disclosed !== false) fail("backup_snapshot_prior_backup_path_disclosed_not_false");

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
  if (exec[key] !== false) fail(`backup_snapshot_${key}_not_false`);
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
  "absolute_path_disclosed",
  "operator_home_path_disclosed",
  "local_storage_root_disclosed",
]) {
  if (safety[key] !== false) fail(`backup_snapshot_safety_${key}_not_false`);
}

const manifest = {
  manifest_marker: "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_MANIFEST_V1",
  public_safe: true,
  dataset_id: backup.dataset_id,
  selected_type: backup.selected_type,
  target_mirror_node_label: backup.target_mirror_node_label,
  manifest_sha256: backup.manifest_sha256,
  content_root_sha256: backup.content_root_sha256,
  object_count: backup.object_count,
  total_bytes: backup.total_bytes,
  source_pre_execution_backup_id: backup.pre_execution_backup_id,
  storage_root_disclosed: false,
  local_path_disclosed: false,
  absolute_path_disclosed: false,
  operator_home_path_disclosed: false
};

const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
const manifestHash = hash(manifestJson);
fs.writeFileSync(outputFile.replace(/backup-snapshot\.json$/, "backup-snapshot-manifest.json"), manifestJson);

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_V1",
  version: 1,
  ok: true,
  backup_snapshot_state: "backup_snapshot_packet_created_no_execution",
  snapshot_operator_label: operatorLabel,
  pre_execution_backup_id: backup.pre_execution_backup_id,
  manual_execute_id: backup.manual_execute_id,
  terminal_execute_review_id: backup.terminal_execute_review_id,
  runtime_duplicate_guard_id: backup.runtime_duplicate_guard_id,
  command_packet_id: backup.command_packet_id,
  selected_type: backup.selected_type,
  dataset_id: backup.dataset_id,
  mirror_node_label: backup.mirror_node_label || null,
  target_mirror_node_label: backup.target_mirror_node_label,
  manifest_sha256: backup.manifest_sha256,
  content_root_sha256: backup.content_root_sha256,
  object_count: backup.object_count,
  total_bytes: backup.total_bytes,
  backup_manifest: {
    marker: manifest.manifest_marker,
    sha256: manifestHash,
    public_safe: true,
    created_now: true,
    storage_snapshot_created_now: false,
    storage_root_disclosed: false,
    local_path_disclosed: false,
    absolute_path_disclosed: false,
    operator_home_path_disclosed: false
  },
  validation: {
    pre_execution_backup_packet_valid: true,
    pre_execution_backup_id_hash_verified: true,
    manual_execute_id_hash_verified: true,
    command_packet_referenced_by_id: true,
    exact_command_revealed_now: false,
    exact_command_printed_now: false,
    command_string_disclosed: false
  },
  execution_gate: {
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
    backup_snapshot_packet_public_safe: true,
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

packet.backup_snapshot_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.backup_snapshot_id_scope = "sha256 over backup snapshot packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("backup_snapshot_pre_execution_backup_marker_valid=true");
console.log("backup_snapshot_pre_execution_backup_id_hash_verified=true");
console.log("backup_snapshot_manual_execute_id_hash_verified=true");
console.log("backup_snapshot_command_packet_referenced_by_id=true");
console.log("backup_snapshot_exact_command_revealed_now=false");
console.log("backup_snapshot_exact_command_printed_now=false");
console.log("backup_snapshot_command_string_disclosed=false");
console.log("backup_snapshot_manifest_created_now=true");
console.log("backup_snapshot_manifest_public_safe=true");
console.log("backup_snapshot_storage_snapshot_created_now=false");
console.log("backup_snapshot_storage_root_disclosed=false");
console.log("backup_snapshot_manual_execute_allowed_now=false");
console.log("backup_snapshot_manual_execute_performed_now=false");
console.log("backup_snapshot_terminal_execute_allowed_now=false");
console.log("backup_snapshot_terminal_execute_performed_now=false");
console.log("backup_snapshot_shell_execution_performed_now=false");
console.log("backup_snapshot_command_executed_now=false");
console.log("backup_snapshot_mirror_executed_now=false");
console.log("backup_snapshot_pin_executed_now=false");
console.log("backup_snapshot_public_mutation=false");
console.log("backup_snapshot_ledger_write=false");
console.log("backup_snapshot_wc_credit_award=false");
console.log("backup_snapshot_id=" + packet.backup_snapshot_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/backup-snapshot.json" "$OUT_DIR/backup-snapshot-manifest.json"; then
  echo "backup_snapshot_private_leak_scan_green=false"
  exit 1
fi

echo "backup_snapshot_packet_path=$OUT_DIR/backup-snapshot.json"
echo "backup_snapshot_manifest_path=$OUT_DIR/backup-snapshot-manifest.json"
echo "backup_snapshot_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_V1_GREEN"
