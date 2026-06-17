#!/usr/bin/env bash
set -euo pipefail

BACKUP_SNAPSHOT_FILE="${BACKUP_SNAPSHOT_FILE:-}"
BACKUP_SNAPSHOT_MANIFEST_FILE="${BACKUP_SNAPSHOT_MANIFEST_FILE:-}"
RESTORE_OPERATOR_LABEL="${RESTORE_OPERATOR_LABEL:-void-backup-restore-readiness-operator-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-backup-restore-readiness-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$BACKUP_SNAPSHOT_FILE" ] || [ -z "$BACKUP_SNAPSHOT_MANIFEST_FILE" ]; then
  echo "backup_restore_readiness_required_files_present=false"
  exit 1
fi

if [ ! -f "$BACKUP_SNAPSHOT_FILE" ] || [ ! -f "$BACKUP_SNAPSHOT_MANIFEST_FILE" ]; then
  echo "backup_restore_readiness_required_files_exist=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$BACKUP_SNAPSHOT_FILE" "$OUT_DIR/backup-snapshot.json"
cp "$BACKUP_SNAPSHOT_MANIFEST_FILE" "$OUT_DIR/backup-snapshot-manifest.json"

echo "VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_V1"
echo "restore_operator_label=$RESTORE_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/backup-snapshot.json" "$OUT_DIR/backup-snapshot-manifest.json" "$OUT_DIR/backup-restore-readiness.json" "$RESTORE_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const snapshotFile = process.argv[2];
const manifestFile = process.argv[3];
const outputFile = process.argv[4];
const operatorLabel = process.argv[5];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("backup_restore_readiness_operator_label_safe=false");

const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

if (snapshot.marker !== "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_V1") fail("backup_restore_readiness_snapshot_marker_valid=false");
if (snapshot.ok !== true) fail("backup_restore_readiness_snapshot_ok=false");
if (snapshot.backup_snapshot_state !== "backup_snapshot_packet_created_no_execution") fail("backup_restore_readiness_snapshot_state_valid=false");
if (!isSha(snapshot.backup_snapshot_id)) fail("backup_restore_readiness_snapshot_id_valid=false");

const snapshotCopy = JSON.parse(JSON.stringify(snapshot));
const snapshotId = snapshotCopy.backup_snapshot_id;
delete snapshotCopy.backup_snapshot_id;
delete snapshotCopy.backup_snapshot_id_scope;
if (hash(JSON.stringify(snapshotCopy, null, 2) + "\n") !== snapshotId) {
  fail("backup_restore_readiness_snapshot_id_hash_verified=false");
}

if (manifest.manifest_marker !== "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_MANIFEST_V1") fail("backup_restore_readiness_manifest_marker_valid=false");
if (manifest.public_safe !== true) fail("backup_restore_readiness_manifest_public_safe=false");
if (hash(JSON.stringify(manifest, null, 2) + "\n") !== snapshot.backup_manifest.sha256) {
  fail("backup_restore_readiness_manifest_hash_verified=false");
}

if (snapshot.validation.pre_execution_backup_packet_valid !== true) fail("backup_restore_readiness_pre_execution_backup_packet_valid=false");
if (snapshot.validation.pre_execution_backup_id_hash_verified !== true) fail("backup_restore_readiness_pre_execution_backup_id_hash_verified=false");
if (snapshot.validation.manual_execute_id_hash_verified !== true) fail("backup_restore_readiness_manual_execute_id_hash_verified=false");
if (snapshot.validation.command_packet_referenced_by_id !== true) fail("backup_restore_readiness_command_packet_referenced_by_id=false");
if (snapshot.validation.exact_command_revealed_now !== false) fail("backup_restore_readiness_exact_command_revealed_now_not_false");
if (snapshot.validation.exact_command_printed_now !== false) fail("backup_restore_readiness_exact_command_printed_now_not_false");
if (snapshot.validation.command_string_disclosed !== false) fail("backup_restore_readiness_command_string_disclosed_not_false");

if (snapshot.backup_manifest.created_now !== true) fail("backup_restore_readiness_snapshot_manifest_created_now=false");
if (snapshot.backup_manifest.public_safe !== true) fail("backup_restore_readiness_snapshot_manifest_public_safe=false");
if (snapshot.backup_manifest.storage_snapshot_created_now !== false) fail("backup_restore_readiness_storage_snapshot_created_now_not_false");
if (snapshot.backup_manifest.storage_root_disclosed !== false) fail("backup_restore_readiness_storage_root_disclosed_not_false");
if (snapshot.backup_manifest.local_path_disclosed !== false) fail("backup_restore_readiness_local_path_disclosed_not_false");
if (snapshot.backup_manifest.absolute_path_disclosed !== false) fail("backup_restore_readiness_absolute_path_disclosed_not_false");
if (snapshot.backup_manifest.operator_home_path_disclosed !== false) fail("backup_restore_readiness_operator_home_path_disclosed_not_false");

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
  if (snapshot.execution_gate[key] !== false) fail(`backup_restore_readiness_snapshot_${key}_not_false`);
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
  if (snapshot.public_safety[key] !== false) fail(`backup_restore_readiness_snapshot_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_V1",
  version: 1,
  ok: true,
  backup_restore_readiness_state: "restore_readiness_packet_created_no_restore_no_execution",
  restore_operator_label: operatorLabel,
  backup_snapshot_id: snapshot.backup_snapshot_id,
  pre_execution_backup_id: snapshot.pre_execution_backup_id,
  manual_execute_id: snapshot.manual_execute_id,
  terminal_execute_review_id: snapshot.terminal_execute_review_id,
  runtime_duplicate_guard_id: snapshot.runtime_duplicate_guard_id,
  command_packet_id: snapshot.command_packet_id,
  selected_type: snapshot.selected_type,
  dataset_id: snapshot.dataset_id,
  mirror_node_label: snapshot.mirror_node_label || null,
  target_mirror_node_label: snapshot.target_mirror_node_label,
  manifest_sha256: snapshot.manifest_sha256,
  content_root_sha256: snapshot.content_root_sha256,
  object_count: snapshot.object_count,
  total_bytes: snapshot.total_bytes,
  restore_boundary: {
    restore_readiness_required_before_live_execute: true,
    backup_snapshot_packet_valid: true,
    backup_snapshot_id_hash_verified: true,
    backup_snapshot_manifest_valid: true,
    backup_snapshot_manifest_hash_verified: true,
    pre_execution_backup_packet_valid: true,
    command_packet_referenced_by_id: true,
    restore_plan_created_now: true,
    backup_restore_executed_now: false,
    storage_snapshot_restored_now: false,
    live_state_changed_now: false,
    restore_path_disclosed: false
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
    backup_restore_readiness_packet_public_safe: true,
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

packet.backup_restore_readiness_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.backup_restore_readiness_id_scope = "sha256 over backup restore readiness packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("backup_restore_readiness_snapshot_marker_valid=true");
console.log("backup_restore_readiness_snapshot_id_hash_verified=true");
console.log("backup_restore_readiness_manifest_marker_valid=true");
console.log("backup_restore_readiness_manifest_hash_verified=true");
console.log("backup_restore_readiness_pre_execution_backup_packet_valid=true");
console.log("backup_restore_readiness_command_packet_referenced_by_id=true");
console.log("backup_restore_readiness_restore_plan_created_now=true");
console.log("backup_restore_readiness_backup_restore_executed_now=false");
console.log("backup_restore_readiness_storage_snapshot_restored_now=false");
console.log("backup_restore_readiness_live_state_changed_now=false");
console.log("backup_restore_readiness_manual_execute_allowed_now=false");
console.log("backup_restore_readiness_manual_execute_performed_now=false");
console.log("backup_restore_readiness_terminal_execute_allowed_now=false");
console.log("backup_restore_readiness_terminal_execute_performed_now=false");
console.log("backup_restore_readiness_shell_execution_performed_now=false");
console.log("backup_restore_readiness_command_executed_now=false");
console.log("backup_restore_readiness_mirror_executed_now=false");
console.log("backup_restore_readiness_pin_executed_now=false");
console.log("backup_restore_readiness_public_mutation=false");
console.log("backup_restore_readiness_ledger_write=false");
console.log("backup_restore_readiness_wc_credit_award=false");
console.log("backup_restore_readiness_id=" + packet.backup_restore_readiness_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/backup-restore-readiness.json"; then
  echo "backup_restore_readiness_private_leak_scan_green=false"
  exit 1
fi

echo "backup_restore_readiness_packet_path=$OUT_DIR/backup-restore-readiness.json"
echo "backup_restore_readiness_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_V1_GREEN"
