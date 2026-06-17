#!/usr/bin/env bash
set -euo pipefail

OPERATOR_RELEASE_REVIEW_FILE="${OPERATOR_RELEASE_REVIEW_FILE:-}"
RELEASE_APPROVAL_OPERATOR_LABEL="${RELEASE_APPROVAL_OPERATOR_LABEL:-void-operator-release-approval-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-peer-pin-operator-release-approval-packet-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$OPERATOR_RELEASE_REVIEW_FILE" ]; then
  echo "operator_release_approval_review_file_required=false"
  exit 1
fi

if [ ! -f "$OPERATOR_RELEASE_REVIEW_FILE" ]; then
  echo "operator_release_approval_review_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$OPERATOR_RELEASE_REVIEW_FILE" "$OUT_DIR/operator-release-review.json"

echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_V1"
echo "release_approval_operator_label=$RELEASE_APPROVAL_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

node - "$OUT_DIR/operator-release-review.json" "$OUT_DIR/operator-release-approval.json" "$RELEASE_APPROVAL_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const reviewFile = process.argv[2];
const outputFile = process.argv[3];
const operatorLabel = process.argv[4];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,120}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!safe(operatorLabel)) fail("operator_release_approval_operator_label_safe=false");

const review = JSON.parse(fs.readFileSync(reviewFile, "utf8"));

if (review.marker !== "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REVIEW_PACKET_V1") fail("operator_release_approval_review_marker_valid=false");
if (review.ok !== true) fail("operator_release_approval_review_ok=false");
if (review.operator_release_review_state !== "operator_release_review_performed_execution_still_held") fail("operator_release_approval_review_state_valid=false");
if (!isSha(review.operator_release_review_id)) fail("operator_release_approval_review_id_valid=false");

const reviewCopy = JSON.parse(JSON.stringify(review));
const reviewId = reviewCopy.operator_release_review_id;
delete reviewCopy.operator_release_review_id;
delete reviewCopy.operator_release_review_id_scope;
if (hash(JSON.stringify(reviewCopy, null, 2) + "\n") !== reviewId) {
  fail("operator_release_approval_review_id_hash_verified=false");
}

if (review.release_review_boundary.operator_release_request_packet_valid !== true) fail("operator_release_approval_request_packet_valid=false");
if (review.release_review_boundary.operator_release_request_id_hash_verified !== true) fail("operator_release_approval_request_id_hash_verified=false");
if (review.release_review_boundary.operator_release_request_recorded_now !== true) fail("operator_release_approval_request_recorded_now=false");
if (review.release_review_boundary.operator_release_review_performed_now !== true) fail("operator_release_approval_review_performed_now=false");
if (review.release_review_boundary.operator_release_approved_now !== false) fail("operator_release_approval_prior_approved_now_not_false");
if (review.release_review_boundary.final_execute_released_now !== false) fail("operator_release_approval_prior_final_execute_released_now_not_false");
if (review.release_review_boundary.terminal_release_recorded_now !== false) fail("operator_release_approval_prior_terminal_release_recorded_now_not_false");
if (review.release_review_boundary.final_execute_allowed_now !== false) fail("operator_release_approval_prior_final_execute_allowed_now_not_false");

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
  if (review.execution_gate[key] !== false) fail(`operator_release_approval_review_${key}_not_false`);
}

if (review.command_disclosure_gate.exact_command_revealed_now !== false) fail("operator_release_approval_exact_command_revealed_now_not_false");
if (review.command_disclosure_gate.exact_command_printed_now !== false) fail("operator_release_approval_exact_command_printed_now_not_false");
if (review.command_disclosure_gate.command_string_disclosed !== false) fail("operator_release_approval_command_string_disclosed_not_false");
if (review.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("operator_release_approval_command_packet_referenced_by_id=false");

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
  if (review.public_safety[key] !== false) fail(`operator_release_approval_review_safety_${key}_not_false`);
}

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_V1",
  version: 1,
  ok: true,
  operator_release_approval_state: "operator_release_approved_terminal_release_still_required",
  release_approval_operator_label: operatorLabel,
  operator_release_review_id: review.operator_release_review_id,
  operator_release_request_id: review.operator_release_request_id,
  final_execute_hold_id: review.final_execute_hold_id,
  final_execute_readiness_id: review.final_execute_readiness_id,
  backup_restore_readiness_id: review.backup_restore_readiness_id,
  backup_snapshot_id: review.backup_snapshot_id,
  pre_execution_backup_id: review.pre_execution_backup_id,
  manual_execute_id: review.manual_execute_id,
  terminal_execute_review_id: review.terminal_execute_review_id,
  runtime_duplicate_guard_id: review.runtime_duplicate_guard_id,
  command_packet_id: review.command_packet_id,
  selected_type: review.selected_type,
  dataset_id: review.dataset_id,
  mirror_node_label: review.mirror_node_label || null,
  target_mirror_node_label: review.target_mirror_node_label,
  manifest_sha256: review.manifest_sha256,
  content_root_sha256: review.content_root_sha256,
  object_count: review.object_count,
  total_bytes: review.total_bytes,
  release_approval_boundary: {
    operator_release_review_packet_valid: true,
    operator_release_review_id_hash_verified: true,
    operator_release_request_recorded_now: true,
    operator_release_review_performed_now: true,
    operator_release_approved_now: true,
    terminal_release_still_required: true,
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
    operator_release_approval_packet_public_safe: true,
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

packet.operator_release_approval_id = hash(JSON.stringify(packet, null, 2) + "\n");
packet.operator_release_approval_id_scope = "sha256 over operator release approval packet before id fields";

fs.writeFileSync(outputFile, JSON.stringify(packet, null, 2) + "\n");

console.log("operator_release_approval_review_marker_valid=true");
console.log("operator_release_approval_review_id_hash_verified=true");
console.log("operator_release_approval_request_recorded_now=true");
console.log("operator_release_approval_review_performed_now=true");
console.log("operator_release_approval_approved_now=true");
console.log("operator_release_approval_terminal_release_still_required=true");
console.log("operator_release_approval_final_execute_released_now=false");
console.log("operator_release_approval_terminal_release_recorded_now=false");
console.log("operator_release_approval_final_execute_allowed_now=false");
console.log("operator_release_approval_command_executed_now=false");
console.log("operator_release_approval_mirror_executed_now=false");
console.log("operator_release_approval_pin_executed_now=false");
console.log("operator_release_approval_public_mutation=false");
console.log("operator_release_approval_ledger_write=false");
console.log("operator_release_approval_wc_credit_award=false");
console.log("operator_release_approval_exact_command_revealed_now=false");
console.log("operator_release_approval_exact_command_printed_now=false");
console.log("operator_release_approval_command_string_disclosed=false");
console.log("operator_release_approval_id=" + packet.operator_release_approval_id);
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/operator-release-approval.json"; then
  echo "operator_release_approval_private_leak_scan_green=false"
  exit 1
fi

echo "operator_release_approval_packet_path=$OUT_DIR/operator-release-approval.json"
echo "operator_release_approval_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_V1_GREEN"
