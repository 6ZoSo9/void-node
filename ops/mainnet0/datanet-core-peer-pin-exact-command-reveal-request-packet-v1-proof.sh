#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-exact-command-reveal-request-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Exact Command Reveal Request Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream command disclosure approval packets ==="
UPSTREAM_LOG="$OUT/upstream-command-disclosure-approval-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-command-disclosure-approval-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-command-disclosure-approval-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "exact_command_reveal_request_upstream_out_found=false"
  exit 1
fi

echo "exact_command_reveal_request_upstream_out_found=true"
echo "exact_command_reveal_request_upstream_out=$UPSTREAM_OUT"

PUBLISHED_APPROVAL="$UPSTREAM_OUT/published-command-disclosure-approval/command-disclosure-approval.json"
MIRRORED_APPROVAL="$UPSTREAM_OUT/mirrored-command-disclosure-approval/command-disclosure-approval.json"

for f in "$PUBLISHED_APPROVAL" "$MIRRORED_APPROVAL"; do
  if [ ! -f "$f" ]; then
    echo "exact_command_reveal_request_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published exact command reveal request packet ==="
COMMAND_DISCLOSURE_APPROVAL_FILE="$PUBLISHED_APPROVAL" \
EXACT_COMMAND_REVEAL_REQUEST_OPERATOR_LABEL="exact-command-reveal-request-proof-operator" \
OUT_DIR="$OUT/published-exact-command-reveal-request" \
ops/mainnet0/datanet-core-peer-pin-exact-command-reveal-request-packet-v1.sh | tee "$OUT/published-exact-command-reveal-request.log"

echo
echo "=== create mirrored exact command reveal request packet ==="
COMMAND_DISCLOSURE_APPROVAL_FILE="$MIRRORED_APPROVAL" \
EXACT_COMMAND_REVEAL_REQUEST_OPERATOR_LABEL="exact-command-reveal-request-proof-operator" \
OUT_DIR="$OUT/mirrored-exact-command-reveal-request" \
ops/mainnet0/datanet-core-peer-pin-exact-command-reveal-request-packet-v1.sh | tee "$OUT/mirrored-exact-command-reveal-request.log"

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

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_V1") fail("exact_command_reveal_request_marker_valid=false");
if (packet.ok !== true) fail("exact_command_reveal_request_ok=false");
if (packet.exact_command_reveal_request_state !== "exact_command_reveal_requested_command_still_withheld_execution_not_performed") fail("exact_command_reveal_request_state_valid=false");
if (packet.selected_type !== expectedType) fail("exact_command_reveal_request_selected_type_valid=false");
if (!isSha(packet.exact_command_reveal_request_id)) fail("exact_command_reveal_request_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.exact_command_reveal_request_id;
delete copy.exact_command_reveal_request_id;
delete copy.exact_command_reveal_request_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("exact_command_reveal_request_id_hash_verified=false");

const b = packet.exact_command_reveal_request_boundary;
if (b.command_disclosure_approval_packet_valid !== true) fail("exact_command_reveal_request_approval_packet_valid=false");
if (b.command_disclosure_approval_id_hash_verified !== true) fail("exact_command_reveal_request_approval_id_hash_verified=false");
if (b.command_disclosure_approved_now !== true) fail("exact_command_reveal_request_disclosure_approved_now=false");
if (b.exact_command_reveal_request_recorded_now !== true) fail("exact_command_reveal_request_recorded_now=false");
if (b.exact_command_reveal_approved_now !== false) fail("exact_command_reveal_request_approved_now_not_false");
if (b.exact_command_reveal_still_required !== true) fail("exact_command_reveal_request_still_required=false");
if (b.exact_command_revealed_now !== false) fail("exact_command_reveal_request_exact_command_revealed_now_not_false");
if (b.exact_command_printed_now !== false) fail("exact_command_reveal_request_exact_command_printed_now_not_false");
if (b.command_string_disclosed !== false) fail("exact_command_reveal_request_command_string_disclosed_not_false");
if (b.final_execute_allowed_now !== false) fail("exact_command_reveal_request_final_execute_allowed_now_not_false");
if (b.terminal_execute_allowed_now !== false) fail("exact_command_reveal_request_terminal_execute_allowed_now_not_false");

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
  if (packet.execution_gate[key] !== false) fail(`exact_command_reveal_request_${key}_not_false`);
}

if (packet.command_disclosure_gate.exact_command_revealed_now !== false) fail("exact_command_reveal_request_gate_exact_command_revealed_now_not_false");
if (packet.command_disclosure_gate.exact_command_printed_now !== false) fail("exact_command_reveal_request_gate_exact_command_printed_now_not_false");
if (packet.command_disclosure_gate.command_string_disclosed !== false) fail("exact_command_reveal_request_gate_command_string_disclosed_not_false");
if (packet.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("exact_command_reveal_request_command_packet_referenced_by_id=false");

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
  if (packet.public_safety[key] !== false) fail(`exact_command_reveal_request_safety_${key}_not_false`);
}

console.log("exact_command_reveal_request_marker_valid=true");
console.log("exact_command_reveal_request_id_hash_verified=true");
console.log("exact_command_reveal_request_selected_type=" + packet.selected_type);
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
NODE
}

echo
echo "=== validate published exact command reveal request packet ==="
validate_packet "$OUT/published-exact-command-reveal-request/exact-command-reveal-request.json" "operator_published"

echo
echo "=== validate mirrored exact command reveal request packet ==="
validate_packet "$OUT/mirrored-exact-command-reveal-request/exact-command-reveal-request.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-exact-command-reveal-request-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_V1_GREEN' "$OUT/published-exact-command-reveal-request.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_V1_GREEN' "$OUT/mirrored-exact-command-reveal-request.log"

echo
echo "peer_pin_exact_command_reveal_request_published_packet_green=true"
echo "peer_pin_exact_command_reveal_request_mirrored_packet_green=true"
echo "exact_command_reveal_request_command_disclosure_approved_now=true"
echo "exact_command_reveal_request_recorded_now=true"
echo "exact_command_reveal_request_approved_now=false"
echo "exact_command_reveal_request_exact_command_revealed_now=false"
echo "exact_command_reveal_request_exact_command_printed_now=false"
echo "exact_command_reveal_request_command_string_disclosed=false"
echo "exact_command_reveal_request_final_execute_allowed_now=false"
echo "exact_command_reveal_request_terminal_execute_allowed_now=false"
echo "exact_command_reveal_request_command_executed_now=false"
echo "exact_command_reveal_request_mirror_executed_now=false"
echo "exact_command_reveal_request_pin_executed_now=false"
echo "exact_command_reveal_request_public_mutation=false"
echo "exact_command_reveal_request_ledger_write=false"
echo "exact_command_reveal_request_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_REQUEST_PACKET_PROOF_V1_GREEN"
