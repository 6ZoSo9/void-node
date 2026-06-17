#!/usr/bin/env bash
set -euo pipefail

EXACT_COMMAND_PACKET_FILE="${EXACT_COMMAND_PACKET_FILE:-}"
LOCAL_BASE="${LOCAL_BASE:-${BASE:-http://127.0.0.1:4100}}"
RUNTIME_GUARD_OPERATOR_LABEL="${RUNTIME_GUARD_OPERATOR_LABEL:-void-runtime-duplicate-guard-local}"
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/void-datanet-core-peer-pin-final-runtime-duplicate-guard-v1-$(date -u +%Y%m%d-%H%M%S)-$$}"

if [ -z "$EXACT_COMMAND_PACKET_FILE" ]; then
  echo "exact_command_packet_file_required=false"
  exit 1
fi

if [ ! -f "$EXACT_COMMAND_PACKET_FILE" ]; then
  echo "exact_command_packet_file_exists=false"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_V1"
echo "local_base=$LOCAL_BASE"
echo "runtime_guard_operator_label=$RUNTIME_GUARD_OPERATOR_LABEL"
echo "out_dir=$OUT_DIR"

cp "$EXACT_COMMAND_PACKET_FILE" "$OUT_DIR/exact-execute-command-packet.json"

node - "$OUT_DIR/exact-execute-command-packet.json" "$OUT_DIR/command.env" "$RUNTIME_GUARD_OPERATOR_LABEL" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const packetFile = process.argv[2];
const envFile = process.argv[3];
const runtimeGuardOperatorLabel = process.argv[4];

const packet = JSON.parse(fs.readFileSync(packetFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safeId = (v) => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,96}$/.test(v);

if (!safeId(runtimeGuardOperatorLabel)) fail("runtime_duplicate_guard_operator_label_safe=false");

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_V1") fail("runtime_duplicate_guard_command_packet_marker_valid=false");
if (packet.ok !== true) fail("runtime_duplicate_guard_command_packet_ok=false");
if (!isSha(packet.command_packet_id)) fail("runtime_duplicate_guard_command_packet_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
delete copy.command_packet_id;
delete copy.command_packet_id_scope;
const recomputed = crypto.createHash("sha256").update(JSON.stringify(copy, null, 2) + "\n").digest("hex");

if (recomputed !== packet.command_packet_id) fail("runtime_duplicate_guard_command_packet_id_hash_verified=false");

if (packet.command_scope !== "execute_command_packet_only_no_execution") fail("runtime_duplicate_guard_command_scope_valid=false");
if (!(packet.command_packet_state === "exact_command_rendered_not_executed" || packet.command_packet_state === "exact_command_blocked_executor_gap_not_executed")) {
  fail("runtime_duplicate_guard_command_packet_state_valid=false");
}

if (!(packet.selected_type === "operator_published" || packet.selected_type === "mirrored")) fail("runtime_duplicate_guard_selected_type_valid=false");
if (!safeId(packet.dataset_id)) fail("runtime_duplicate_guard_dataset_id_safe=false");
if (packet.selected_type === "mirrored" && !safeId(packet.mirror_node_label)) fail("runtime_duplicate_guard_mirror_node_label_safe=false");
if (!safeId(packet.target_mirror_node_label)) fail("runtime_duplicate_guard_target_mirror_node_label_safe=false");

if (!isSha(packet.approval_id)) fail("runtime_duplicate_guard_approval_id_valid=false");
if (!isSha(packet.preflight_id)) fail("runtime_duplicate_guard_preflight_id_valid=false");
if (!isSha(packet.plan_id)) fail("runtime_duplicate_guard_plan_id_valid=false");
if (!isSha(packet.review_id)) fail("runtime_duplicate_guard_review_id_valid=false");
if (!isSha(packet.request_id)) fail("runtime_duplicate_guard_request_id_valid=false");
if (!isSha(packet.manifest_sha256)) fail("runtime_duplicate_guard_manifest_sha256_valid=false");
if (!isSha(packet.content_root_sha256)) fail("runtime_duplicate_guard_content_root_sha256_valid=false");
if (Number(packet.object_count) <= 0) fail("runtime_duplicate_guard_object_count_valid=false");
if (Number(packet.total_bytes) < 0) fail("runtime_duplicate_guard_total_bytes_valid=false");

const validation = packet.approval_validation || {};
if (validation.approval_packet_valid !== true) fail("runtime_duplicate_guard_approval_packet_valid=false");
if (validation.approval_id_hash_verified !== true) fail("runtime_duplicate_guard_approval_id_hash_verified=false");
if (validation.final_preflight_valid !== true) fail("runtime_duplicate_guard_final_preflight_valid=false");
if (validation.preflight_id_hash_verified !== true) fail("runtime_duplicate_guard_preflight_id_hash_verified=false");
if (validation.dry_run_plan_valid !== true) fail("runtime_duplicate_guard_dry_run_plan_valid=false");
if (validation.plan_id_hash_verified !== true) fail("runtime_duplicate_guard_plan_id_hash_verified=false");
if (validation.review_id_hash_verified !== true) fail("runtime_duplicate_guard_review_id_hash_verified=false");
if (validation.request_id_hash_verified !== true) fail("runtime_duplicate_guard_request_id_hash_verified=false");
if (validation.duplicate_local_availability_check_performed !== true) fail("runtime_duplicate_guard_prior_duplicate_check_performed=false");
if (validation.source_peer_reachable !== true) fail("runtime_duplicate_guard_source_peer_reachable=false");
if (validation.final_peer_content_verify_green !== true) fail("runtime_duplicate_guard_final_peer_content_verify_green=false");
if (validation.explicit_operator_approval_recorded_now !== true) fail("runtime_duplicate_guard_operator_approval_recorded=false");

const command = packet.exact_execute_command || {};
if (packet.selected_type === "operator_published") {
  if (command.current_executor_supports_selected_type !== true) fail("runtime_duplicate_guard_published_executor_support=false");
  if (command.command_rendered_now !== true) fail("runtime_duplicate_guard_published_command_rendered=false");
} else {
  if (command.current_executor_supports_selected_type !== false) fail("runtime_duplicate_guard_mirrored_executor_support_not_false");
  if (command.mirrored_source_executor_required !== true) fail("runtime_duplicate_guard_mirrored_executor_required=false");
  if (command.command_rendered_now !== false) fail("runtime_duplicate_guard_mirrored_command_rendered_not_false");
}

if (command.command_executed_now !== false) fail("runtime_duplicate_guard_command_executed_now_not_false");

const gate = packet.operator_gate || {};
if (gate.operator_approval_recorded_now !== true) fail("runtime_duplicate_guard_operator_approval_recorded_now=false");
if (gate.exact_execute_command_packet_created_now !== true) fail("runtime_duplicate_guard_command_packet_created_now=false");
if (gate.execution_allowed_now !== false) fail("runtime_duplicate_guard_prior_execution_allowed_now_not_false");
if (gate.command_executed_now !== false) fail("runtime_duplicate_guard_prior_command_executed_now_not_false");
if (gate.mirror_executed_now !== false) fail("runtime_duplicate_guard_prior_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("runtime_duplicate_guard_prior_pin_executed_now_not_false");

const required = packet.required_after_command_packet_before_execution || {};
if (required.final_command_review_required !== true) fail("runtime_duplicate_guard_final_command_review_required=false");
if (required.pre_execution_backup_required !== true) fail("runtime_duplicate_guard_backup_required=false");
if (required.backup_created_now !== false) fail("runtime_duplicate_guard_backup_created_now_not_false");
if (required.final_runtime_duplicate_guard_required !== true) fail("runtime_duplicate_guard_required=false");
if (required.operator_terminal_execute_required !== true) fail("runtime_duplicate_guard_terminal_execute_required=false");
if (required.execute_packet_must_be_rechecked_before_run !== true) fail("runtime_duplicate_guard_recheck_required=false");

const safety = packet.public_safety || {};
if (safety.exact_command_packet_public_safe !== true) fail("runtime_duplicate_guard_command_packet_public_safe=false");
if (safety.public_mutation !== false) fail("runtime_duplicate_guard_command_packet_public_mutation_not_false");
if (safety.ledger_write !== false) fail("runtime_duplicate_guard_command_packet_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("runtime_duplicate_guard_command_packet_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("runtime_duplicate_guard_command_packet_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("runtime_duplicate_guard_command_packet_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("runtime_duplicate_guard_command_packet_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("runtime_duplicate_guard_command_packet_local_storage_root_disclosed_not_false");

fs.writeFileSync(envFile, [
  "COMMAND_PACKET_ID=" + packet.command_packet_id,
  "APPROVAL_ID=" + packet.approval_id,
  "PREFLIGHT_ID=" + packet.preflight_id,
  "PLAN_ID=" + packet.plan_id,
  "REVIEW_ID=" + packet.review_id,
  "REQUEST_ID=" + packet.request_id,
  "SELECTED_TYPE=" + packet.selected_type,
  "DATASET_ID=" + packet.dataset_id,
  "MIRROR_NODE_LABEL=" + (packet.mirror_node_label || ""),
  "TARGET_MIRROR_NODE_LABEL=" + packet.target_mirror_node_label,
  "MANIFEST_SHA256=" + packet.manifest_sha256,
  "CONTENT_ROOT_SHA256=" + packet.content_root_sha256,
  "OBJECT_COUNT=" + packet.object_count,
  "TOTAL_BYTES=" + packet.total_bytes,
  "CURRENT_EXECUTOR_SUPPORTS_SELECTED_TYPE=" + String(command.current_executor_supports_selected_type),
  "MIRRORED_SOURCE_EXECUTOR_REQUIRED=" + String(command.mirrored_source_executor_required === true),
  "COMMAND_RENDERED_NOW=" + String(command.command_rendered_now)
].join("\n") + "\n");

console.log("runtime_duplicate_guard_command_packet_marker_valid=true");
console.log("runtime_duplicate_guard_command_packet_id_hash_verified=true");
console.log("runtime_duplicate_guard_approval_id_hash_verified=true");
console.log("runtime_duplicate_guard_final_preflight_valid=true");
console.log("runtime_duplicate_guard_preflight_id_hash_verified=true");
console.log("runtime_duplicate_guard_plan_id_hash_verified=true");
console.log("runtime_duplicate_guard_review_id_hash_verified=true");
console.log("runtime_duplicate_guard_request_id_hash_verified=true");
console.log("runtime_duplicate_guard_source_peer_reachable=true");
console.log("runtime_duplicate_guard_final_peer_content_verify_green=true");
console.log("runtime_duplicate_guard_operator_approval_recorded_now=true");
console.log("runtime_duplicate_guard_selected_type=" + packet.selected_type);
console.log("runtime_duplicate_guard_current_executor_supports_selected_type=" + String(command.current_executor_supports_selected_type));
console.log("runtime_duplicate_guard_mirrored_source_executor_required=" + String(command.mirrored_source_executor_required === true));
console.log("runtime_duplicate_guard_command_rendered_now=" + String(command.command_rendered_now));
console.log("runtime_duplicate_guard_command_executed_now=false");
console.log("runtime_duplicate_guard_execution_allowed_now=false");
console.log("runtime_duplicate_guard_mirror_executed_now=false");
console.log("runtime_duplicate_guard_pin_executed_now=false");
console.log("runtime_duplicate_guard_public_mutation=false");
console.log("runtime_duplicate_guard_ledger_write=false");
console.log("runtime_duplicate_guard_wc_credit_award=false");
NODE

cat "$OUT_DIR/command.env"
. "$OUT_DIR/command.env"

echo
echo "=== final runtime local duplicate availability check ==="
curl -fsS "$LOCAL_BASE/public-node/datanet/core-peer-availability-index-v1.json" > "$OUT_DIR/local-availability-index.json"

node - "$OUT_DIR/local-availability-index.json" "$OUT_DIR/runtime-duplicate.env" "$DATASET_ID" "$MANIFEST_SHA256" "$CONTENT_ROOT_SHA256" <<'NODE'
const fs = require("node:fs");

const indexFile = process.argv[2];
const envFile = process.argv[3];
const datasetId = process.argv[4];
const manifestSha = process.argv[5];
const contentRoot = process.argv[6];

const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };

if (index.marker !== "VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_V1") fail("runtime_duplicate_guard_local_index_marker_valid=false");
if (index.ok !== true) fail("runtime_duplicate_guard_local_index_ok=false");

const safety = index.public_safety || {};
if (safety.public_mutation !== false) fail("runtime_duplicate_guard_local_index_public_mutation_not_false");
if (safety.ledger_write !== false) fail("runtime_duplicate_guard_local_index_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("runtime_duplicate_guard_local_index_wc_credit_award_not_false");

const published = Array.isArray(index.operator_published) ? index.operator_published : [];
const mirrored = Array.isArray(index.mirrored) ? index.mirrored : [];

const matches = [];

for (const entry of published) {
  if (entry.dataset_id === datasetId && entry.manifest_sha256 === manifestSha && entry.content_root_sha256 === contentRoot) {
    matches.push("operator_published");
  }
}

for (const entry of mirrored) {
  if (entry.dataset_id === datasetId && entry.manifest_sha256 === manifestSha && entry.content_root_sha256 === contentRoot) {
    matches.push("mirrored");
  }
}

const duplicateFound = matches.length > 0;

fs.writeFileSync(envFile, [
  "RUNTIME_DUPLICATE_FOUND=" + String(duplicateFound),
  "RUNTIME_DUPLICATE_MATCH_COUNT=" + matches.length,
  "RUNTIME_DUPLICATE_MATCH_TYPES=" + (matches.join(",") || "none")
].join("\n") + "\n");

console.log("runtime_duplicate_guard_local_index_marker_valid=true");
console.log("runtime_duplicate_guard_performed_now=true");
console.log("runtime_duplicate_guard_duplicate_found=" + String(duplicateFound));
console.log("runtime_duplicate_guard_duplicate_match_count=" + matches.length);
console.log("runtime_duplicate_guard_local_index_public_mutation=false");
console.log("runtime_duplicate_guard_local_index_ledger_write=false");
console.log("runtime_duplicate_guard_local_index_wc_credit_award=false");
NODE

cat "$OUT_DIR/runtime-duplicate.env"
. "$OUT_DIR/runtime-duplicate.env"

node - "$OUT_DIR/runtime-duplicate-guard.nohash.json" \
  "$RUNTIME_GUARD_OPERATOR_LABEL" \
  "$COMMAND_PACKET_ID" \
  "$APPROVAL_ID" \
  "$PREFLIGHT_ID" \
  "$PLAN_ID" \
  "$REVIEW_ID" \
  "$REQUEST_ID" \
  "$SELECTED_TYPE" \
  "$DATASET_ID" \
  "$MIRROR_NODE_LABEL" \
  "$TARGET_MIRROR_NODE_LABEL" \
  "$MANIFEST_SHA256" \
  "$CONTENT_ROOT_SHA256" \
  "$OBJECT_COUNT" \
  "$TOTAL_BYTES" \
  "$CURRENT_EXECUTOR_SUPPORTS_SELECTED_TYPE" \
  "$MIRRORED_SOURCE_EXECUTOR_REQUIRED" \
  "$COMMAND_RENDERED_NOW" \
  "$RUNTIME_DUPLICATE_FOUND" \
  "$RUNTIME_DUPLICATE_MATCH_COUNT" \
  "$RUNTIME_DUPLICATE_MATCH_TYPES" <<'NODE'
const fs = require("node:fs");

const [
  outFile,
  runtimeGuardOperatorLabel,
  commandPacketId,
  approvalId,
  preflightId,
  planId,
  reviewId,
  requestId,
  selectedType,
  datasetId,
  mirrorNodeLabel,
  targetMirrorNodeLabel,
  manifestSha,
  contentRootSha,
  objectCountRaw,
  totalBytesRaw,
  currentExecutorSupportsRaw,
  mirroredSourceExecutorRequiredRaw,
  commandRenderedRaw,
  duplicateFoundRaw,
  duplicateMatchCountRaw,
  duplicateMatchTypes
] = process.argv.slice(2);

const duplicateFound = duplicateFoundRaw === "true";
const currentExecutorSupports = currentExecutorSupportsRaw === "true";
const mirroredSourceExecutorRequired = mirroredSourceExecutorRequiredRaw === "true";
const commandRendered = commandRenderedRaw === "true";

const packet = {
  marker: "VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_V1",
  version: 1,
  ok: true,
  guard_state: "final_runtime_duplicate_guard_complete_not_executed",
  execution_decision: duplicateFound
    ? "duplicate_found_execution_held"
    : "no_duplicate_found_execution_still_held_for_terminal_review",
  runtime_guard_operator_label: runtimeGuardOperatorLabel,
  command_packet_id: commandPacketId,
  approval_id: approvalId,
  preflight_id: preflightId,
  plan_id: planId,
  review_id: reviewId,
  request_id: requestId,
  selected_type: selectedType,
  dataset_id: datasetId,
  mirror_node_label: selectedType === "mirrored" ? mirrorNodeLabel : null,
  target_mirror_node_label: targetMirrorNodeLabel,
  manifest_sha256: manifestSha,
  content_root_sha256: contentRootSha,
  object_count: Number(objectCountRaw),
  total_bytes: Number(totalBytesRaw),
  command_packet_validation: {
    exact_execute_command_packet_valid: true,
    command_packet_id_hash_verified: true,
    approval_id_hash_verified: true,
    final_preflight_valid: true,
    preflight_id_hash_verified: true,
    dry_run_plan_valid: true,
    plan_id_hash_verified: true,
    review_id_hash_verified: true,
    request_id_hash_verified: true,
    source_peer_reachable: true,
    final_peer_content_verify_green: true,
    operator_approval_recorded_now: true
  },
  final_runtime_duplicate_guard: {
    performed_now: true,
    duplicate_found: duplicateFound,
    duplicate_match_count: Number(duplicateMatchCountRaw),
    duplicate_match_types: duplicateMatchTypes,
    local_availability_index_checked_now: true
  },
  exact_execute_command: {
    selected_type: selectedType,
    current_executor_supports_selected_type: currentExecutorSupports,
    mirrored_source_executor_required: mirroredSourceExecutorRequired,
    command_rendered_now: commandRendered,
    command_executed_now: false
  },
  required_after_runtime_duplicate_guard_before_execution: {
    final_operator_terminal_review_required: true,
    pre_execution_backup_required: true,
    backup_created_now: false,
    exact_command_packet_recheck_required: true,
    runtime_duplicate_guard_recheck_required_if_delayed: true,
    operator_terminal_execute_required: true
  },
  operator_gate: {
    runtime_duplicate_guard_performed_now: true,
    execution_allowed_now: false,
    command_executed_now: false,
    mirror_executed_now: false,
    pin_executed_now: false
  },
  public_safety: {
    runtime_duplicate_guard_packet_public_safe: true,
    public_post_upload: false,
    public_shell_execution: false,
    public_mutation: false,
    automatic_mirror: false,
    automatic_pin: false,
    ledger_write: false,
    wc_credit_award: false,
    local_path_disclosed: false,
    absolute_path_disclosed: false,
    operator_home_path_disclosed: false,
    local_storage_root_disclosed: false
  }
};

fs.writeFileSync(outFile, JSON.stringify(packet, null, 2) + "\n");
NODE

RUNTIME_GUARD_ID="$(sha256sum "$OUT_DIR/runtime-duplicate-guard.nohash.json" | awk '{print $1}')"

node - "$OUT_DIR/runtime-duplicate-guard.nohash.json" "$OUT_DIR/runtime-duplicate-guard.json" "$RUNTIME_GUARD_ID" <<'NODE'
const fs = require("node:fs");

const input = process.argv[2];
const output = process.argv[3];
const guardId = process.argv[4];

const packet = JSON.parse(fs.readFileSync(input, "utf8"));
packet.runtime_duplicate_guard_id = guardId;
packet.runtime_duplicate_guard_id_scope = "sha256 over final runtime duplicate guard packet without runtime_duplicate_guard_id fields";

fs.writeFileSync(output, JSON.stringify(packet, null, 2) + "\n");
NODE

node - "$OUT_DIR/runtime-duplicate-guard.json" <<'NODE'
const fs = require("node:fs");
const packet = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_V1") fail("runtime_duplicate_guard_marker_valid=false");
if (packet.ok !== true) fail("runtime_duplicate_guard_ok=false");
if (!isSha(packet.runtime_duplicate_guard_id)) fail("runtime_duplicate_guard_id_valid=false");
if (packet.guard_state !== "final_runtime_duplicate_guard_complete_not_executed") fail("runtime_duplicate_guard_state_valid=false");

const validation = packet.command_packet_validation || {};
if (validation.exact_execute_command_packet_valid !== true) fail("runtime_duplicate_guard_command_packet_valid=false");
if (validation.command_packet_id_hash_verified !== true) fail("runtime_duplicate_guard_command_packet_id_hash_verified=false");
if (validation.approval_id_hash_verified !== true) fail("runtime_duplicate_guard_approval_id_hash_verified=false");
if (validation.final_preflight_valid !== true) fail("runtime_duplicate_guard_final_preflight_valid=false");
if (validation.preflight_id_hash_verified !== true) fail("runtime_duplicate_guard_preflight_id_hash_verified=false");
if (validation.dry_run_plan_valid !== true) fail("runtime_duplicate_guard_dry_run_plan_valid=false");
if (validation.plan_id_hash_verified !== true) fail("runtime_duplicate_guard_plan_id_hash_verified=false");
if (validation.review_id_hash_verified !== true) fail("runtime_duplicate_guard_review_id_hash_verified=false");
if (validation.request_id_hash_verified !== true) fail("runtime_duplicate_guard_request_id_hash_verified=false");
if (validation.source_peer_reachable !== true) fail("runtime_duplicate_guard_source_peer_reachable=false");
if (validation.final_peer_content_verify_green !== true) fail("runtime_duplicate_guard_final_verify_green=false");
if (validation.operator_approval_recorded_now !== true) fail("runtime_duplicate_guard_operator_approval_recorded=false");

const guard = packet.final_runtime_duplicate_guard || {};
if (guard.performed_now !== true) fail("runtime_duplicate_guard_performed_now=false");
if (guard.local_availability_index_checked_now !== true) fail("runtime_duplicate_guard_local_availability_checked_now=false");

const command = packet.exact_execute_command || {};
if (packet.selected_type === "operator_published") {
  if (command.current_executor_supports_selected_type !== true) fail("runtime_duplicate_guard_published_executor_support=false");
  if (command.command_rendered_now !== true) fail("runtime_duplicate_guard_published_command_rendered=false");
} else if (packet.selected_type === "mirrored") {
  if (command.current_executor_supports_selected_type !== false) fail("runtime_duplicate_guard_mirrored_executor_support_not_false");
  if (command.mirrored_source_executor_required !== true) fail("runtime_duplicate_guard_mirrored_executor_required=false");
  if (command.command_rendered_now !== false) fail("runtime_duplicate_guard_mirrored_command_rendered_not_false");
} else {
  fail("runtime_duplicate_guard_selected_type_valid=false");
}

if (command.command_executed_now !== false) fail("runtime_duplicate_guard_command_executed_now_not_false");

const required = packet.required_after_runtime_duplicate_guard_before_execution || {};
if (required.final_operator_terminal_review_required !== true) fail("runtime_duplicate_guard_final_terminal_review_required=false");
if (required.pre_execution_backup_required !== true) fail("runtime_duplicate_guard_backup_required=false");
if (required.backup_created_now !== false) fail("runtime_duplicate_guard_backup_created_now_not_false");
if (required.exact_command_packet_recheck_required !== true) fail("runtime_duplicate_guard_command_packet_recheck_required=false");
if (required.runtime_duplicate_guard_recheck_required_if_delayed !== true) fail("runtime_duplicate_guard_recheck_if_delayed_required=false");
if (required.operator_terminal_execute_required !== true) fail("runtime_duplicate_guard_terminal_execute_required=false");

const gate = packet.operator_gate || {};
if (gate.runtime_duplicate_guard_performed_now !== true) fail("runtime_duplicate_guard_gate_performed_now=false");
if (gate.execution_allowed_now !== false) fail("runtime_duplicate_guard_execution_allowed_now_not_false");
if (gate.command_executed_now !== false) fail("runtime_duplicate_guard_gate_command_executed_now_not_false");
if (gate.mirror_executed_now !== false) fail("runtime_duplicate_guard_mirror_executed_now_not_false");
if (gate.pin_executed_now !== false) fail("runtime_duplicate_guard_pin_executed_now_not_false");

const safety = packet.public_safety || {};
if (safety.runtime_duplicate_guard_packet_public_safe !== true) fail("runtime_duplicate_guard_packet_public_safe=false");
if (safety.public_post_upload !== false) fail("runtime_duplicate_guard_public_post_upload_not_false");
if (safety.public_shell_execution !== false) fail("runtime_duplicate_guard_public_shell_execution_not_false");
if (safety.public_mutation !== false) fail("runtime_duplicate_guard_public_mutation_not_false");
if (safety.automatic_mirror !== false) fail("runtime_duplicate_guard_automatic_mirror_not_false");
if (safety.automatic_pin !== false) fail("runtime_duplicate_guard_automatic_pin_not_false");
if (safety.ledger_write !== false) fail("runtime_duplicate_guard_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("runtime_duplicate_guard_wc_credit_award_not_false");
if (safety.local_path_disclosed !== false) fail("runtime_duplicate_guard_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("runtime_duplicate_guard_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("runtime_duplicate_guard_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("runtime_duplicate_guard_local_storage_root_disclosed_not_false");

console.log("runtime_duplicate_guard_marker_valid=true");
console.log("runtime_duplicate_guard_id_valid=true");
console.log("runtime_duplicate_guard_packet_created=true");
console.log("runtime_duplicate_guard_command_packet_id_hash_verified=true");
console.log("runtime_duplicate_guard_performed_now=true");
console.log("runtime_duplicate_guard_duplicate_found=" + String(guard.duplicate_found));
console.log("runtime_duplicate_guard_duplicate_match_count=" + String(guard.duplicate_match_count));
console.log("runtime_duplicate_guard_execution_allowed_now=false");
console.log("runtime_duplicate_guard_command_executed_now=false");
console.log("runtime_duplicate_guard_mirror_executed_now=false");
console.log("runtime_duplicate_guard_pin_executed_now=false");
console.log("runtime_duplicate_guard_public_mutation=false");
console.log("runtime_duplicate_guard_ledger_write=false");
console.log("runtime_duplicate_guard_wc_credit_award=false");
NODE

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT_DIR/runtime-duplicate-guard.json"; then
  echo "runtime_duplicate_guard_private_leak_scan_green=false"
  exit 1
fi

echo "runtime_duplicate_guard_packet_path=$OUT_DIR/runtime-duplicate-guard.json"
echo "runtime_duplicate_guard_id=$RUNTIME_GUARD_ID"
echo "runtime_duplicate_guard_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_V1_GREEN"
