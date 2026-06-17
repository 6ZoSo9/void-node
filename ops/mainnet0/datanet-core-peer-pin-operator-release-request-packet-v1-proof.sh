#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-operator-release-request-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Operator Release Request Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream final execute hold packets ==="
UPSTREAM_LOG="$OUT/upstream-final-execute-hold-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-final-execute-hold-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-final-execute-hold-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "operator_release_request_upstream_out_found=false"
  exit 1
fi

echo "operator_release_request_upstream_out_found=true"
echo "operator_release_request_upstream_out=$UPSTREAM_OUT"

PUBLISHED_HOLD="$UPSTREAM_OUT/published-final-execute-hold/final-execute-hold.json"
MIRRORED_HOLD="$UPSTREAM_OUT/mirrored-final-execute-hold/final-execute-hold.json"

for f in "$PUBLISHED_HOLD" "$MIRRORED_HOLD"; do
  if [ ! -f "$f" ]; then
    echo "operator_release_request_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published operator release request packet ==="
FINAL_EXECUTE_HOLD_FILE="$PUBLISHED_HOLD" \
RELEASE_REQUEST_OPERATOR_LABEL="operator-release-request-proof-operator" \
OUT_DIR="$OUT/published-operator-release-request" \
ops/mainnet0/datanet-core-peer-pin-operator-release-request-packet-v1.sh | tee "$OUT/published-operator-release-request.log"

echo
echo "=== create mirrored operator release request packet ==="
FINAL_EXECUTE_HOLD_FILE="$MIRRORED_HOLD" \
RELEASE_REQUEST_OPERATOR_LABEL="operator-release-request-proof-operator" \
OUT_DIR="$OUT/mirrored-operator-release-request" \
ops/mainnet0/datanet-core-peer-pin-operator-release-request-packet-v1.sh | tee "$OUT/mirrored-operator-release-request.log"

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

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_V1") fail("operator_release_request_marker_valid=false");
if (packet.ok !== true) fail("operator_release_request_ok=false");
if (packet.operator_release_request_state !== "operator_release_requested_execution_still_held") fail("operator_release_request_state_valid=false");
if (packet.selected_type !== expectedType) fail("operator_release_request_selected_type_valid=false");
if (!isSha(packet.operator_release_request_id)) fail("operator_release_request_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.operator_release_request_id;
delete copy.operator_release_request_id;
delete copy.operator_release_request_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("operator_release_request_id_hash_verified=false");

if (packet.release_request_boundary.final_execute_hold_packet_valid !== true) fail("operator_release_request_hold_packet_valid=false");
if (packet.release_request_boundary.final_execute_hold_id_hash_verified !== true) fail("operator_release_request_hold_id_hash_verified=false");
if (packet.release_request_boundary.final_execute_hold_required !== true) fail("operator_release_request_hold_required=false");
if (packet.release_request_boundary.operator_release_request_recorded_now !== true) fail("operator_release_request_recorded_now=false");
if (packet.release_request_boundary.operator_release_approved_now !== false) fail("operator_release_request_approved_now_not_false");
if (packet.release_request_boundary.final_execute_released_now !== false) fail("operator_release_request_final_execute_released_now_not_false");
if (packet.release_request_boundary.terminal_release_recorded_now !== false) fail("operator_release_request_terminal_release_recorded_now_not_false");
if (packet.release_request_boundary.final_execute_allowed_now !== false) fail("operator_release_request_final_execute_allowed_now_not_false");

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
  if (packet.execution_gate[key] !== false) fail(`operator_release_request_${key}_not_false`);
}

if (packet.command_disclosure_gate.exact_command_revealed_now !== false) fail("operator_release_request_exact_command_revealed_now_not_false");
if (packet.command_disclosure_gate.exact_command_printed_now !== false) fail("operator_release_request_exact_command_printed_now_not_false");
if (packet.command_disclosure_gate.command_string_disclosed !== false) fail("operator_release_request_command_string_disclosed_not_false");
if (packet.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("operator_release_request_command_packet_referenced_by_id=false");

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
  if (packet.public_safety[key] !== false) fail(`operator_release_request_safety_${key}_not_false`);
}

console.log("operator_release_request_marker_valid=true");
console.log("operator_release_request_id_hash_verified=true");
console.log("operator_release_request_selected_type=" + packet.selected_type);
console.log("operator_release_request_recorded_now=true");
console.log("operator_release_request_approved_now=false");
console.log("operator_release_request_final_execute_released_now=false");
console.log("operator_release_request_final_execute_allowed_now=false");
console.log("operator_release_request_command_executed_now=false");
console.log("operator_release_request_mirror_executed_now=false");
console.log("operator_release_request_pin_executed_now=false");
console.log("operator_release_request_public_mutation=false");
console.log("operator_release_request_ledger_write=false");
console.log("operator_release_request_wc_credit_award=false");
console.log("operator_release_request_command_string_disclosed=false");
NODE
}

echo
echo "=== validate published operator release request packet ==="
validate_packet "$OUT/published-operator-release-request/operator-release-request.json" "operator_published"

echo
echo "=== validate mirrored operator release request packet ==="
validate_packet "$OUT/mirrored-operator-release-request/operator-release-request.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-operator-release-request-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_V1_GREEN' "$OUT/published-operator-release-request.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_V1_GREEN' "$OUT/mirrored-operator-release-request.log"

echo
echo "peer_pin_operator_release_request_published_packet_green=true"
echo "peer_pin_operator_release_request_mirrored_packet_green=true"
echo "operator_release_request_recorded_now=true"
echo "operator_release_request_approved_now=false"
echo "operator_release_request_final_execute_released_now=false"
echo "operator_release_request_final_execute_allowed_now=false"
echo "operator_release_request_command_executed_now=false"
echo "operator_release_request_mirror_executed_now=false"
echo "operator_release_request_pin_executed_now=false"
echo "operator_release_request_public_mutation=false"
echo "operator_release_request_ledger_write=false"
echo "operator_release_request_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_RELEASE_REQUEST_PACKET_PROOF_V1_GREEN"
