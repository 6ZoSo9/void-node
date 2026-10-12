#!/usr/bin/env bash
set -euo pipefail

FINAL_EXECUTE_HOLD_FILE="${FINAL_EXECUTE_HOLD_FILE:-}"
RELEASE_REQUEST_OPERATOR_LABEL="${RELEASE_REQUEST_OPERATOR_LABEL:-void-operator-release-request-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-operator-release-request-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$FINAL_EXECUTE_HOLD_FILE" ]; then
  echo "operator_release_request_hold_file_required=false"
  exit 1
fi

if [ ! -f "$FINAL_EXECUTE_HOLD_FILE" ]; then
  echo "operator_release_request_hold_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$FINAL_EXECUTE_HOLD_FILE" "$OUT_DIR/final-execute-hold.json"

echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_V1"
echo "release_request_operator_label=$RELEASE_REQUEST_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/final-execute-hold.json" "$OUT_DIR/operator-release-request.json" "$RELEASE_REQUEST_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const holdFile = process.argv[2];
const outputFile = process.argv[3];
const operatorLabel = process.argv[4];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("operator_release_request_operator_label_safe=false");

const hold = JSON.parse(fs.readFileSync(holdFile, "utf8"));

if (hold.marker !== "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_V1") fail("operator_release_request_hold_marker_valid=false");
if (hold.ok !== true) fail("operator_release_request_hold_ok=false");
if (hold.final_execute_hold_state !== "final_execute_hold_packet_created_execution_still_held") fail("operator_release_request_hold_state_valid=false");
if (!isSha(hold.final_execute_hold_id)) fail("operator_release_request_hold_id_valid=false");

const holdCopy = JSON.parse(JSON.stringify(hold));
const holdId = holdCopy.final_execute_hold_id;
delete holdCopy.final_execute_hold_id;
delete holdCopy.final_execute_hold_id_scope;
if (hash(JSON.stringify(holdCopy, null, 2) + "\n") !== holdId) {
  fail("operator_release_request_hold_id_hash_verified=false");
}

for (const key of [
  "readiness_packet_valid",
  "readiness_id_hash_verified",
  "readiness_chain_complete",
  "final_execute_hold_required",
]) {
  if (hold.hold_boundary[key] !== true) fail(`operator_release_request_hold_boundary_${key}_not_true`);
}

for (const key of [
  "final_execute_released_now",
  "operator_release_recorded_now",
  "terminal_release_recorded_now",
  "final_execute_allowed_now",
]) {
  if (hold.hold_boundary[key] !== false) fail(`operator_release_request_hold_boundary_${key}_not_false`);
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
  if (hold.execution_gate[key] !== false) fail(`operator_release_request_hold_${key}_not_false`);
}

if (hold.command_disclosure_gate.exact_command_revealed_now !== false) fail("operator_release_request_exact_command_revealed_now_not_false");
if (hold.command_disclosure_gate.exact_command_printed_now !== false) fail("operator_release_request_exact_command_printed_now_not_false");
if (hold.command_disclosure_gate.command_string_disclosed !== false) fail("operator_release_request_command_string_disclosed_not_false");
if (hold.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("operator_release_request_command_packet_referenced_by_id=false");

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
  if (hold.public_safety[key] !== false) fail(`operator_release_request_hold_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_V1",
  version: 1,
  ok: true,
  operator_release_request_state: "operator_release_requested_execution_still_held",
  release_request_operator_label: operatorLabel,
  final_execute_hold_id: hold.final_execute_hold_id,
  final_execute_readiness_id: hold.final_execute_readiness_id,
  backup_restore_readiness_id: hold.backup_restore_readiness_id,
  backup_snapshot_id: hold.backup_snapshot_id,
  pre_execution_backup_id: hold.pre_execution_backup_id,
  manual_execute_id: hold.manual_execute_id,
  terminal_execute_review_id: hold.terminal_execute_review_id,
  runtime_duplicate_guard_id: hold.runtime_duplicate_guard_id,
  command_packet_id: hold.command_packet_id,
  selected_type: hold.selected_type,
  dataset_id: hold.dataset_id,
  mirror_node_label: hold.mirror_node_label || null,
  target_mirror_node_label: hold.target_mirror_node_label,
  manifest_sha256: hold.manifest_sha256,
  content_root_sha256: hold.content_root_sha256,
  object_count: hold.object_count,
  total_bytes: hold.total_bytes,
  release_request_boundary: {
    final_execute_hold_packet_valid: true,
    final_execute_hold_id_hash_verified: true,
    final_execute_hold_required: true,
    operator_release_request_recorded_now: true,
    operator_release_approved_now: false,
    final_execute_released_now: false,
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
    operator_release_request_packet_public_safe: true,
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

packet.operator_release_request_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.operator_release_request_id_scope = "sha256 over operator release request packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("operator_release_request_hold_marker_valid=true");
console.log("operator_release_request_hold_id_hash_verified=true");
console.log("operator_release_request_hold_required=true");
console.log("operator_release_request_recorded_now=true");
console.log("operator_release_request_approved_now=false");
console.log("operator_release_request_final_execute_released_now=false");
console.log("operator_release_request_terminal_release_recorded_now=false");
console.log("operator_release_request_final_execute_allowed_now=false");
console.log("operator_release_request_command_executed_now=false");
console.log("operator_release_request_mirror_executed_now=false");
console.log("operator_release_request_pin_executed_now=false");
console.log("operator_release_request_public_mutation=false");
console.log("operator_release_request_ledger_write=false");
console.log("operator_release_request_wc_credit_award=false");
console.log("operator_release_request_exact_command_revealed_now=false");
console.log("operator_release_request_exact_command_printed_now=false");
console.log("operator_release_request_command_string_disclosed=false");
console.log("operator_release_request_id=" + packet.operator_release_request_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/operator-release-request.json"; then
  echo "operator_release_request_private_leak_scan_green=false"
  exit 1
fi

echo "operator_release_request_packet_path=$OUT_DIR/operator-release-request.json"
echo "operator_release_request_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_V1_GREEN"
