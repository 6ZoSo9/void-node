#!/usr/bin/env bash
set -euo pipefail

COMMAND_DISCLOSURE_APPROVAL_FILE="${COMMAND_DISCLOSURE_APPROVAL_FILE:-}"
EXACT_COMMAND_REVEAL_REQUEST_OPERATOR_LABEL="${EXACT_COMMAND_REVEAL_REQUEST_OPERATOR_LABEL:-void-exact-command-reveal-request-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-exact-command-reveal-request-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$COMMAND_DISCLOSURE_APPROVAL_FILE" ]; then
  echo "exact_command_reveal_request_approval_file_required=false"
  exit 1
fi

if [ ! -f "$COMMAND_DISCLOSURE_APPROVAL_FILE" ]; then
  echo "exact_command_reveal_request_approval_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$COMMAND_DISCLOSURE_APPROVAL_FILE" "$OUT_DIR/command-disclosure-approval.json"

echo "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_V1"
echo "exact_command_reveal_request_operator_label=$EXACT_COMMAND_REVEAL_REQUEST_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/command-disclosure-approval.json" "$OUT_DIR/exact-command-reveal-request.json" "$EXACT_COMMAND_REVEAL_REQUEST_OPERATOR_LABEL" <<'NODE'
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

if (!safe(operatorLabel)) fail("exact_command_reveal_request_operator_label_safe=false");

const approval = JSON.parse(fs.readFileSync(approvalFile, "utf8"));

if (approval.marker !== "VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_APPROVAL_PACKET_V1") fail("exact_command_reveal_request_approval_marker_valid=false");
if (approval.ok !== true) fail("exact_command_reveal_request_approval_ok=false");
if (approval.command_disclosure_approval_state !== "command_disclosure_approved_command_still_withheld_execution_not_performed") fail("exact_command_reveal_request_approval_state_valid=false");
if (!isSha(approval.command_disclosure_approval_id)) fail("exact_command_reveal_request_approval_id_valid=false");

const approvalCopy = JSON.parse(JSON.stringify(approval));
const approvalId = approvalCopy.command_disclosure_approval_id;
delete approvalCopy.command_disclosure_approval_id;
delete approvalCopy.command_disclosure_approval_id_scope;
if (hash(JSON.stringify(approvalCopy, null, 2) + "\n") !== approvalId) {
  fail("exact_command_reveal_request_approval_id_hash_verified=false");
}

const boundary = approval.command_disclosure_approval_boundary || {};
if (boundary.command_disclosure_review_packet_valid !== true) fail("exact_command_reveal_request_review_packet_valid=false");
if (boundary.command_disclosure_review_id_hash_verified !== true) fail("exact_command_reveal_request_review_id_hash_verified=false");
if (boundary.command_disclosure_review_performed_now !== true) fail("exact_command_reveal_request_review_performed_now=false");
if (boundary.command_disclosure_approved_now !== true) fail("exact_command_reveal_request_command_disclosure_approved_now=false");
if (boundary.exact_command_reveal_still_required !== true) fail("exact_command_reveal_request_exact_command_reveal_still_required=false");
if (boundary.exact_command_revealed_now !== false) fail("exact_command_reveal_request_prior_exact_command_revealed_now_not_false");
if (boundary.exact_command_printed_now !== false) fail("exact_command_reveal_request_prior_exact_command_printed_now_not_false");
if (boundary.command_string_disclosed !== false) fail("exact_command_reveal_request_prior_command_string_disclosed_not_false");
if (boundary.final_execute_allowed_now !== false) fail("exact_command_reveal_request_prior_final_execute_allowed_now_not_false");
if (boundary.terminal_execute_allowed_now !== false) fail("exact_command_reveal_request_prior_terminal_execute_allowed_now_not_false");

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
  if (approval.execution_gate[key] !== false) fail(`exact_command_reveal_request_approval_${key}_not_false`);
}

if (approval.command_disclosure_gate.exact_command_revealed_now !== false) fail("exact_command_reveal_request_gate_exact_command_revealed_now_not_false");
if (approval.command_disclosure_gate.exact_command_printed_now !== false) fail("exact_command_reveal_request_gate_exact_command_printed_now_not_false");
if (approval.command_disclosure_gate.command_string_disclosed !== false) fail("exact_command_reveal_request_gate_command_string_disclosed_not_false");
if (approval.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("exact_command_reveal_request_command_packet_referenced_by_id=false");

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
  if (approval.public_safety[key] !== false) fail(`exact_command_reveal_request_approval_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_V1",
  version: 1,
  ok: true,
  exact_command_reveal_request_state: "exact_command_reveal_requested_command_still_withheld_execution_not_performed",
  exact_command_reveal_request_operator_label: operatorLabel,
  command_disclosure_approval_id: approval.command_disclosure_approval_id,
  command_disclosure_review_id: approval.command_disclosure_review_id,
  command_disclosure_readiness_id: approval.command_disclosure_readiness_id,
  terminal_release_record_id: approval.terminal_release_record_id,
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
  exact_command_reveal_request_boundary: {
    command_disclosure_approval_packet_valid: true,
    command_disclosure_approval_id_hash_verified: true,
    command_disclosure_approved_now: true,
    exact_command_reveal_request_recorded_now: true,
    exact_command_reveal_approved_now: false,
    exact_command_reveal_still_required: true,
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
    exact_command_reveal_request_packet_public_safe: true,
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

packet.exact_command_reveal_request_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.exact_command_reveal_request_id_scope = "sha256 over exact command reveal request packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("exact_command_reveal_request_approval_marker_valid=true");
console.log("exact_command_reveal_request_approval_id_hash_verified=true");
console.log("exact_command_reveal_request_command_disclosure_approved_now=true");
console.log("exact_command_reveal_request_recorded_now=true");
console.log("exact_command_reveal_request_approved_now=false");
console.log("exact_command_reveal_request_exact_command_revealed_now=false");
console.log("exact_command_reveal_request_exact_command_printed_now=false");
console.log("exact_command_reveal_request_command_string_disclosed=false");
console.log("exact_command_reveal_request_final_execute_allowed_now=false");
console.log("exact_command_reveal_request_terminal_execute_allowed_now=false");
console.log("exact_command_reveal_request_command_executed_now=false");
console.log("exact_command_reveal_request_mirror_executed_now=false");
console.log("exact_command_reveal_request_pin_executed_now=false");
console.log("exact_command_reveal_request_public_mutation=false");
console.log("exact_command_reveal_request_ledger_write=false");
console.log("exact_command_reveal_request_wc_credit_award=false");
console.log("exact_command_reveal_request_id=" + packet.exact_command_reveal_request_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/exact-command-reveal-request.json"; then
  echo "exact_command_reveal_request_private_leak_scan_green=false"
  exit 1
fi

echo "exact_command_reveal_request_packet_path=$OUT_DIR/exact-command-reveal-request.json"
echo "exact_command_reveal_request_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_V1_GREEN"
