#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-operator-release-approval-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Operator Release Approval Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream operator release review packets ==="
UPSTREAM_LOG="$OUT/upstream-operator-release-review-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-operator-release-review-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-operator-release-review-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "operator_release_approval_upstream_out_found=false"
  exit 1
fi

echo "operator_release_approval_upstream_out_found=true"
echo "operator_release_approval_upstream_out=$UPSTREAM_OUT"

PUBLISHED_REVIEW="$UPSTREAM_OUT/published-operator-release-review/operator-release-review.json"
MIRRORED_REVIEW="$UPSTREAM_OUT/mirrored-operator-release-review/operator-release-review.json"

for f in "$PUBLISHED_REVIEW" "$MIRRORED_REVIEW"; do
  if [ ! -f "$f" ]; then
    echo "operator_release_approval_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published operator release approval packet ==="
OPERATOR_RELEASE_REVIEW_FILE="$PUBLISHED_REVIEW" \
RELEASE_APPROVAL_OPERATOR_LABEL="operator-release-approval-proof-operator" \
OUT_DIR="$OUT/published-operator-release-approval" \
ops/mainnet0/datanet-core-peer-pin-operator-release-approval-packet-v1.sh | tee "$OUT/published-operator-release-approval.log"

echo
echo "=== create mirrored operator release approval packet ==="
OPERATOR_RELEASE_REVIEW_FILE="$MIRRORED_REVIEW" \
RELEASE_APPROVAL_OPERATOR_LABEL="operator-release-approval-proof-operator" \
OUT_DIR="$OUT/mirrored-operator-release-approval" \
ops/mainnet0/datanet-core-peer-pin-operator-release-approval-packet-v1.sh | tee "$OUT/mirrored-operator-release-approval.log"

validate_packet() {
  local packet_file="$1"
  local expected_type="$2"

  node - "$packet_file" "$expected_type" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const packetFile = process.argv[2];
const expectedType = process.argv[3];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const packet = JSON.parse(fs.readFileSync(packetFile, "utf8"));

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_V1") fail("operator_release_approval_marker_valid=false");
if (packet.ok !== true) fail("operator_release_approval_ok=false");
if (packet.operator_release_approval_state !== "operator_release_approved_terminal_release_still_required") fail("operator_release_approval_state_valid=false");
if (packet.selected_type !== expectedType) fail("operator_release_approval_selected_type_valid=false");
if (!isSha(packet.operator_release_approval_id)) fail("operator_release_approval_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.operator_release_approval_id;
delete copy.operator_release_approval_id;
delete copy.operator_release_approval_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("operator_release_approval_id_hash_verified=false");

if (packet.release_approval_boundary.operator_release_review_packet_valid !== true) fail("operator_release_approval_review_packet_valid=false");
if (packet.release_approval_boundary.operator_release_review_id_hash_verified !== true) fail("operator_release_approval_review_id_hash_verified=false");
if (packet.release_approval_boundary.operator_release_request_recorded_now !== true) fail("operator_release_approval_request_recorded_now=false");
if (packet.release_approval_boundary.operator_release_review_performed_now !== true) fail("operator_release_approval_review_performed_now=false");
if (packet.release_approval_boundary.operator_release_approved_now !== true) fail("operator_release_approval_approved_now=false");
if (packet.release_approval_boundary.terminal_release_still_required !== true) fail("operator_release_approval_terminal_release_still_required=false");
if (packet.release_approval_boundary.final_execute_released_now !== false) fail("operator_release_approval_final_execute_released_now_not_false");
if (packet.release_approval_boundary.terminal_release_recorded_now !== false) fail("operator_release_approval_terminal_release_recorded_now_not_false");
if (packet.release_approval_boundary.final_execute_allowed_now !== false) fail("operator_release_approval_final_execute_allowed_now_not_false");

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
  if (packet.execution_gate[key] !== false) fail(`operator_release_approval_${key}_not_false`);
}

if (packet.command_disclosure_gate.exact_command_revealed_now !== false) fail("operator_release_approval_exact_command_revealed_now_not_false");
if (packet.command_disclosure_gate.exact_command_printed_now !== false) fail("operator_release_approval_exact_command_printed_now_not_false");
if (packet.command_disclosure_gate.command_string_disclosed !== false) fail("operator_release_approval_command_string_disclosed_not_false");
if (packet.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("operator_release_approval_command_packet_referenced_by_id=false");

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
  if (packet.public_safety[key] !== false) fail(`operator_release_approval_safety_${key}_not_false`);
}

console.log("operator_release_approval_marker_valid=true");
console.log("operator_release_approval_id_hash_verified=true");
console.log("operator_release_approval_selected_type=" + packet.selected_type);
console.log("operator_release_approval_request_recorded_now=true");
console.log("operator_release_approval_review_performed_now=true");
console.log("operator_release_approval_approved_now=true");
console.log("operator_release_approval_terminal_release_still_required=true");
console.log("operator_release_approval_final_execute_released_now=false");
console.log("operator_release_approval_final_execute_allowed_now=false");
console.log("operator_release_approval_command_executed_now=false");
console.log("operator_release_approval_mirror_executed_now=false");
console.log("operator_release_approval_pin_executed_now=false");
console.log("operator_release_approval_public_mutation=false");
console.log("operator_release_approval_ledger_write=false");
console.log("operator_release_approval_wc_credit_award=false");
console.log("operator_release_approval_command_string_disclosed=false");
NODE
}

echo
echo "=== validate published operator release approval packet ==="
validate_packet "$OUT/published-operator-release-approval/operator-release-approval.json" "operator_published"

echo
echo "=== validate mirrored operator release approval packet ==="
validate_packet "$OUT/mirrored-operator-release-approval/operator-release-approval.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-operator-release-approval-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_V1_GREEN' "$OUT/published-operator-release-approval.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_V1_GREEN' "$OUT/mirrored-operator-release-approval.log"

echo
echo "peer_pin_operator_release_approval_published_packet_green=true"
echo "peer_pin_operator_release_approval_mirrored_packet_green=true"
echo "operator_release_approval_request_recorded_now=true"
echo "operator_release_approval_review_performed_now=true"
echo "operator_release_approval_approved_now=true"
echo "operator_release_approval_terminal_release_still_required=true"
echo "operator_release_approval_final_execute_released_now=false"
echo "operator_release_approval_final_execute_allowed_now=false"
echo "operator_release_approval_command_executed_now=false"
echo "operator_release_approval_mirror_executed_now=false"
echo "operator_release_approval_pin_executed_now=false"
echo "operator_release_approval_public_mutation=false"
echo "operator_release_approval_ledger_write=false"
echo "operator_release_approval_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_APPROVAL_PACKET_PROOF_V1_GREEN"
