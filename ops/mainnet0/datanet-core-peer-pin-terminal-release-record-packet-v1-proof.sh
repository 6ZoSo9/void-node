#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-terminal-release-record-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Terminal Release Record Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream operator release approval packets ==="
UPSTREAM_LOG="$OUT/upstream-operator-release-approval-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-operator-release-approval-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-operator-release-approval-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "terminal_release_record_upstream_out_found=false"
  exit 1
fi

echo "terminal_release_record_upstream_out_found=true"
echo "terminal_release_record_upstream_out=$UPSTREAM_OUT"

PUBLISHED_APPROVAL="$UPSTREAM_OUT/published-operator-release-approval/operator-release-approval.json"
MIRRORED_APPROVAL="$UPSTREAM_OUT/mirrored-operator-release-approval/operator-release-approval.json"

for f in "$PUBLISHED_APPROVAL" "$MIRRORED_APPROVAL"; do
  if [ ! -f "$f" ]; then
    echo "terminal_release_record_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published terminal release record packet ==="
OPERATOR_RELEASE_APPROVAL_FILE="$PUBLISHED_APPROVAL" \
TERMINAL_RELEASE_OPERATOR_LABEL="terminal-release-record-proof-operator" \
OUT_DIR="$OUT/published-terminal-release-record" \
ops/mainnet0/datanet-core-peer-pin-terminal-release-record-packet-v1.sh | tee "$OUT/published-terminal-release-record.log"

echo
echo "=== create mirrored terminal release record packet ==="
OPERATOR_RELEASE_APPROVAL_FILE="$MIRRORED_APPROVAL" \
TERMINAL_RELEASE_OPERATOR_LABEL="terminal-release-record-proof-operator" \
OUT_DIR="$OUT/mirrored-terminal-release-record" \
ops/mainnet0/datanet-core-peer-pin-terminal-release-record-packet-v1.sh | tee "$OUT/mirrored-terminal-release-record.log"

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

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_V1") fail("terminal_release_record_marker_valid=false");
if (packet.ok !== true) fail("terminal_release_record_ok=false");
if (packet.terminal_release_record_state !== "terminal_release_recorded_command_still_withheld_execution_not_performed") fail("terminal_release_record_state_valid=false");
if (packet.selected_type !== expectedType) fail("terminal_release_record_selected_type_valid=false");
if (!isSha(packet.terminal_release_record_id)) fail("terminal_release_record_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.terminal_release_record_id;
delete copy.terminal_release_record_id;
delete copy.terminal_release_record_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("terminal_release_record_id_hash_verified=false");

if (packet.terminal_release_boundary.operator_release_approval_packet_valid !== true) fail("terminal_release_record_approval_packet_valid=false");
if (packet.terminal_release_boundary.operator_release_approval_id_hash_verified !== true) fail("terminal_release_record_approval_id_hash_verified=false");
if (packet.terminal_release_boundary.operator_release_request_recorded_now !== true) fail("terminal_release_record_request_recorded_now=false");
if (packet.terminal_release_boundary.operator_release_review_performed_now !== true) fail("terminal_release_record_review_performed_now=false");
if (packet.terminal_release_boundary.operator_release_approved_now !== true) fail("terminal_release_record_approved_now=false");
if (packet.terminal_release_boundary.terminal_release_recorded_now !== true) fail("terminal_release_record_recorded_now=false");
if (packet.terminal_release_boundary.final_execute_released_now !== true) fail("terminal_release_record_final_execute_released_now=false");
if (packet.terminal_release_boundary.command_disclosure_still_required !== true) fail("terminal_release_record_command_disclosure_still_required=false");
if (packet.terminal_release_boundary.final_execute_allowed_now !== false) fail("terminal_release_record_final_execute_allowed_now_not_false");
if (packet.terminal_release_boundary.terminal_execute_allowed_now !== false) fail("terminal_release_record_terminal_execute_allowed_now_not_false");

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
  if (packet.execution_gate[key] !== false) fail(`terminal_release_record_${key}_not_false`);
}

if (packet.command_disclosure_gate.exact_command_revealed_now !== false) fail("terminal_release_record_exact_command_revealed_now_not_false");
if (packet.command_disclosure_gate.exact_command_printed_now !== false) fail("terminal_release_record_exact_command_printed_now_not_false");
if (packet.command_disclosure_gate.command_string_disclosed !== false) fail("terminal_release_record_command_string_disclosed_not_false");
if (packet.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("terminal_release_record_command_packet_referenced_by_id=false");

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
  if (packet.public_safety[key] !== false) fail(`terminal_release_record_safety_${key}_not_false`);
}

console.log("terminal_release_record_marker_valid=true");
console.log("terminal_release_record_id_hash_verified=true");
console.log("terminal_release_record_selected_type=" + packet.selected_type);
console.log("terminal_release_record_approved_now=true");
console.log("terminal_release_record_recorded_now=true");
console.log("terminal_release_record_final_execute_released_now=true");
console.log("terminal_release_record_command_disclosure_still_required=true");
console.log("terminal_release_record_final_execute_allowed_now=false");
console.log("terminal_release_record_terminal_execute_allowed_now=false");
console.log("terminal_release_record_command_executed_now=false");
console.log("terminal_release_record_mirror_executed_now=false");
console.log("terminal_release_record_pin_executed_now=false");
console.log("terminal_release_record_public_mutation=false");
console.log("terminal_release_record_ledger_write=false");
console.log("terminal_release_record_wc_credit_award=false");
console.log("terminal_release_record_command_string_disclosed=false");
NODE
}

echo
echo "=== validate published terminal release record packet ==="
validate_packet "$OUT/published-terminal-release-record/terminal-release-record.json" "operator_published"

echo
echo "=== validate mirrored terminal release record packet ==="
validate_packet "$OUT/mirrored-terminal-release-record/terminal-release-record.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-terminal-release-record-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_V1_GREEN' "$OUT/published-terminal-release-record.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_V1_GREEN' "$OUT/mirrored-terminal-release-record.log"

echo
echo "peer_pin_terminal_release_record_published_packet_green=true"
echo "peer_pin_terminal_release_record_mirrored_packet_green=true"
echo "terminal_release_record_approved_now=true"
echo "terminal_release_record_recorded_now=true"
echo "terminal_release_record_final_execute_released_now=true"
echo "terminal_release_record_command_disclosure_still_required=true"
echo "terminal_release_record_final_execute_allowed_now=false"
echo "terminal_release_record_terminal_execute_allowed_now=false"
echo "terminal_release_record_command_executed_now=false"
echo "terminal_release_record_mirror_executed_now=false"
echo "terminal_release_record_pin_executed_now=false"
echo "terminal_release_record_public_mutation=false"
echo "terminal_release_record_ledger_write=false"
echo "terminal_release_record_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_TERMINAL_RELEASE_RECORD_PACKET_PROOF_V1_GREEN"
