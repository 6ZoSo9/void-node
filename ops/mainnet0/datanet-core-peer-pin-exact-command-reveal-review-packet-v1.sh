#!/usr/bin/env bash
set -euo pipefail

EXACT_COMMAND_REVEAL_REQUEST_FILE="${EXACT_COMMAND_REVEAL_REQUEST_FILE:-}"
EXACT_COMMAND_REVEAL_REVIEW_OPERATOR_LABEL="${EXACT_COMMAND_REVEAL_REVIEW_OPERATOR_LABEL:-void-exact-command-reveal-review-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-exact-command-reveal-review-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$EXACT_COMMAND_REVEAL_REQUEST_FILE" ]; then
  echo "exact_command_reveal_review_request_file_required=false"
  exit 1
fi

if [ ! -f "$EXACT_COMMAND_REVEAL_REQUEST_FILE" ]; then
  echo "exact_command_reveal_review_request_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$EXACT_COMMAND_REVEAL_REQUEST_FILE" "$OUT_DIR/exact-command-reveal-request.json"

echo "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REVIEW_PACKET_V1"
echo "exact_command_reveal_review_operator_label=$EXACT_COMMAND_REVEAL_REVIEW_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/exact-command-reveal-request.json" "$OUT_DIR/exact-command-reveal-review.json" "$EXACT_COMMAND_REVEAL_REVIEW_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const requestFile = process.argv[2];
const outputFile = process.argv[3];
const operatorLabel = process.argv[4];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("exact_command_reveal_review_operator_label_safe=false");

const request = JSON.parse(fs.readFileSync(requestFile, "utf8"));

if (request.marker !== "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_V1") fail("exact_command_reveal_review_request_marker_valid=false");
if (request.ok !== true) fail("exact_command_reveal_review_request_ok=false");
if (request.exact_command_reveal_request_state !== "exact_command_reveal_requested_command_still_withheld_execution_not_performed") fail("exact_command_reveal_review_request_state_valid=false");
if (!isSha(request.exact_command_reveal_request_id)) fail("exact_command_reveal_review_request_id_valid=false");

const requestCopy = JSON.parse(JSON.stringify(request));
const requestId = requestCopy.exact_command_reveal_request_id;
delete requestCopy.exact_command_reveal_request_id;
delete requestCopy.exact_command_reveal_request_id_scope;
if (hash(JSON.stringify(requestCopy, null, 2) + "\n") !== requestId) {
  fail("exact_command_reveal_review_request_id_hash_verified=false");
}

const b = request.exact_command_reveal_request_boundary || {};
if (b.command_disclosure_approval_packet_valid !== true) fail("exact_command_reveal_review_approval_packet_valid=false");
if (b.command_disclosure_approval_id_hash_verified !== true) fail("exact_command_reveal_review_approval_id_hash_verified=false");
if (b.command_disclosure_approved_now !== true) fail("exact_command_reveal_review_command_disclosure_approved_now=false");
if (b.exact_command_reveal_request_recorded_now !== true) fail("exact_command_reveal_review_request_recorded_now=false");
if (b.exact_command_reveal_approved_now !== false) fail("exact_command_reveal_review_prior_approved_now_not_false");
if (b.exact_command_revealed_now !== false) fail("exact_command_reveal_review_prior_exact_command_revealed_now_not_false");
if (b.exact_command_printed_now !== false) fail("exact_command_reveal_review_prior_exact_command_printed_now_not_false");
if (b.command_string_disclosed !== false) fail("exact_command_reveal_review_prior_command_string_disclosed_not_false");
if (b.final_execute_allowed_now !== false) fail("exact_command_reveal_review_prior_final_execute_allowed_now_not_false");
if (b.terminal_execute_allowed_now !== false) fail("exact_command_reveal_review_prior_terminal_execute_allowed_now_not_false");

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
  if (request.execution_gate[key] !== false) fail(`exact_command_reveal_review_request_${key}_not_false`);
}

if (request.command_disclosure_gate.exact_command_revealed_now !== false) fail("exact_command_reveal_review_gate_exact_command_revealed_now_not_false");
if (request.command_disclosure_gate.exact_command_printed_now !== false) fail("exact_command_reveal_review_gate_exact_command_printed_now_not_false");
if (request.command_disclosure_gate.command_string_disclosed !== false) fail("exact_command_reveal_review_gate_command_string_disclosed_not_false");
if (request.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("exact_command_reveal_review_command_packet_referenced_by_id=false");

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
  if (request.public_safety[key] !== false) fail(`exact_command_reveal_review_request_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REVIEW_PACKET_V1",
  version: 1,
  ok: true,
  exact_command_reveal_review_state: "exact_command_reveal_review_performed_command_still_withheld_execution_not_performed",
  exact_command_reveal_review_operator_label: operatorLabel,
  exact_command_reveal_request_id: request.exact_command_reveal_request_id,
  command_disclosure_approval_id: request.command_disclosure_approval_id,
  command_disclosure_review_id: request.command_disclosure_review_id,
  command_disclosure_readiness_id: request.command_disclosure_readiness_id,
  terminal_release_record_id: request.terminal_release_record_id,
  operator_release_approval_id: request.operator_release_approval_id,
  operator_release_review_id: request.operator_release_review_id,
  operator_release_request_id: request.operator_release_request_id,
  final_execute_hold_id: request.final_execute_hold_id,
  final_execute_readiness_id: request.final_execute_readiness_id,
  backup_restore_readiness_id: request.backup_restore_readiness_id,
  backup_snapshot_id: request.backup_snapshot_id,
  pre_execution_backup_id: request.pre_execution_backup_id,
  manual_execute_id: request.manual_execute_id,
  terminal_execute_review_id: request.terminal_execute_review_id,
  runtime_duplicate_guard_id: request.runtime_duplicate_guard_id,
  command_packet_id: request.command_packet_id,
  selected_type: request.selected_type,
  dataset_id: request.dataset_id,
  mirror_node_label: request.mirror_node_label || null,
  target_mirror_node_label: request.target_mirror_node_label,
  manifest_sha256: request.manifest_sha256,
  content_root_sha256: request.content_root_sha256,
  object_count: request.object_count,
  total_bytes: request.total_bytes,
  exact_command_reveal_review_boundary: {
    exact_command_reveal_request_packet_valid: true,
    exact_command_reveal_request_id_hash_verified: true,
    exact_command_reveal_request_recorded_now: true,
    exact_command_reveal_review_performed_now: true,
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
    exact_command_reveal_review_packet_public_safe: true,
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

packet.exact_command_reveal_review_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.exact_command_reveal_review_id_scope = "sha256 over exact command reveal review packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("exact_command_reveal_review_request_marker_valid=true");
console.log("exact_command_reveal_review_request_id_hash_verified=true");
console.log("exact_command_reveal_review_request_recorded_now=true");
console.log("exact_command_reveal_review_performed_now=true");
console.log("exact_command_reveal_review_approved_now=false");
console.log("exact_command_reveal_review_exact_command_revealed_now=false");
console.log("exact_command_reveal_review_exact_command_printed_now=false");
console.log("exact_command_reveal_review_command_string_disclosed=false");
console.log("exact_command_reveal_review_final_execute_allowed_now=false");
console.log("exact_command_reveal_review_terminal_execute_allowed_now=false");
console.log("exact_command_reveal_review_command_executed_now=false");
console.log("exact_command_reveal_review_mirror_executed_now=false");
console.log("exact_command_reveal_review_pin_executed_now=false");
console.log("exact_command_reveal_review_public_mutation=false");
console.log("exact_command_reveal_review_ledger_write=false");
console.log("exact_command_reveal_review_wc_credit_award=false");
console.log("exact_command_reveal_review_id=" + packet.exact_command_reveal_review_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/exact-command-reveal-review.json"; then
  echo "exact_command_reveal_review_private_leak_scan_green=false"
  exit 1
fi

echo "exact_command_reveal_review_packet_path=$OUT_DIR/exact-command-reveal-review.json"
echo "exact_command_reveal_review_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REVIEW_PACKET_V1_GREEN"
