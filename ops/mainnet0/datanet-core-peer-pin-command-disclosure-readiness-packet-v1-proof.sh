#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-command-disclosure-readiness-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Command Disclosure Readiness Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream terminal release record packets ==="
UPSTREAM_LOG="$OUT/upstream-terminal-release-record-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-terminal-release-record-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-terminal-release-record-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "command_disclosure_readiness_upstream_out_found=false"
  exit 1
fi

echo "command_disclosure_readiness_upstream_out_found=true"
echo "command_disclosure_readiness_upstream_out=$UPSTREAM_OUT"

PUBLISHED_RECORD="$UPSTREAM_OUT/published-terminal-release-record/terminal-release-record.json"
MIRRORED_RECORD="$UPSTREAM_OUT/mirrored-terminal-release-record/terminal-release-record.json"

for f in "$PUBLISHED_RECORD" "$MIRRORED_RECORD"; do
  if [ ! -f "$f" ]; then
    echo "command_disclosure_readiness_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published command disclosure readiness packet ==="
TERMINAL_RELEASE_RECORD_FILE="$PUBLISHED_RECORD" \
COMMAND_DISCLOSURE_OPERATOR_LABEL="command-disclosure-readiness-proof-operator" \
OUT_DIR="$OUT/published-command-disclosure-readiness" \
ops/mainnet0/datanet-core-peer-pin-command-disclosure-readiness-packet-v1.sh | tee "$OUT/published-command-disclosure-readiness.log"

echo
echo "=== create mirrored command disclosure readiness packet ==="
TERMINAL_RELEASE_RECORD_FILE="$MIRRORED_RECORD" \
COMMAND_DISCLOSURE_OPERATOR_LABEL="command-disclosure-readiness-proof-operator" \
OUT_DIR="$OUT/mirrored-command-disclosure-readiness" \
ops/mainnet0/datanet-core-peer-pin-command-disclosure-readiness-packet-v1.sh | tee "$OUT/mirrored-command-disclosure-readiness.log"

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

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_V1") fail("command_disclosure_readiness_marker_valid=false");
if (packet.ok !== true) fail("command_disclosure_readiness_ok=false");
if (packet.command_disclosure_readiness_state !== "command_disclosure_ready_command_still_withheld_execution_not_performed") fail("command_disclosure_readiness_state_valid=false");
if (packet.selected_type !== expectedType) fail("command_disclosure_readiness_selected_type_valid=false");
if (!isSha(packet.command_disclosure_readiness_id)) fail("command_disclosure_readiness_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.command_disclosure_readiness_id;
delete copy.command_disclosure_readiness_id;
delete copy.command_disclosure_readiness_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("command_disclosure_readiness_id_hash_verified=false");

const b = packet.command_disclosure_readiness_boundary;
if (b.terminal_release_record_packet_valid !== true) fail("command_disclosure_readiness_record_packet_valid=false");
if (b.terminal_release_record_id_hash_verified !== true) fail("command_disclosure_readiness_record_id_hash_verified=false");
if (b.operator_release_approved_now !== true) fail("command_disclosure_readiness_approved_now=false");
if (b.terminal_release_recorded_now !== true) fail("command_disclosure_readiness_terminal_release_recorded_now=false");
if (b.final_execute_released_now !== true) fail("command_disclosure_readiness_final_execute_released_now=false");
if (b.command_disclosure_still_required !== true) fail("command_disclosure_readiness_command_disclosure_still_required=false");
if (b.command_disclosure_readiness_created_now !== true) fail("command_disclosure_readiness_created_now=false");
if (b.exact_command_revealed_now !== false) fail("command_disclosure_readiness_exact_command_revealed_now_not_false");
if (b.exact_command_printed_now !== false) fail("command_disclosure_readiness_exact_command_printed_now_not_false");
if (b.command_string_disclosed !== false) fail("command_disclosure_readiness_command_string_disclosed_not_false");
if (b.final_execute_allowed_now !== false) fail("command_disclosure_readiness_final_execute_allowed_now_not_false");
if (b.terminal_execute_allowed_now !== false) fail("command_disclosure_readiness_terminal_execute_allowed_now_not_false");

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
  if (packet.execution_gate[key] !== false) fail(`command_disclosure_readiness_${key}_not_false`);
}

if (packet.command_disclosure_gate.exact_command_revealed_now !== false) fail("command_disclosure_readiness_gate_exact_command_revealed_now_not_false");
if (packet.command_disclosure_gate.exact_command_printed_now !== false) fail("command_disclosure_readiness_gate_exact_command_printed_now_not_false");
if (packet.command_disclosure_gate.command_string_disclosed !== false) fail("command_disclosure_readiness_gate_command_string_disclosed_not_false");
if (packet.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("command_disclosure_readiness_command_packet_referenced_by_id=false");

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
  if (packet.public_safety[key] !== false) fail(`command_disclosure_readiness_safety_${key}_not_false`);
}

console.log("command_disclosure_readiness_marker_valid=true");
console.log("command_disclosure_readiness_id_hash_verified=true");
console.log("command_disclosure_readiness_selected_type=" + packet.selected_type);
console.log("command_disclosure_readiness_approved_now=true");
console.log("command_disclosure_readiness_terminal_release_recorded_now=true");
console.log("command_disclosure_readiness_final_execute_released_now=true");
console.log("command_disclosure_readiness_created_now=true");
console.log("command_disclosure_readiness_exact_command_revealed_now=false");
console.log("command_disclosure_readiness_exact_command_printed_now=false");
console.log("command_disclosure_readiness_command_string_disclosed=false");
console.log("command_disclosure_readiness_final_execute_allowed_now=false");
console.log("command_disclosure_readiness_terminal_execute_allowed_now=false");
console.log("command_disclosure_readiness_command_executed_now=false");
console.log("command_disclosure_readiness_mirror_executed_now=false");
console.log("command_disclosure_readiness_pin_executed_now=false");
console.log("command_disclosure_readiness_public_mutation=false");
console.log("command_disclosure_readiness_ledger_write=false");
console.log("command_disclosure_readiness_wc_credit_award=false");
NODE
}

echo
echo "=== validate published command disclosure readiness packet ==="
validate_packet "$OUT/published-command-disclosure-readiness/command-disclosure-readiness.json" "operator_published"

echo
echo "=== validate mirrored command disclosure readiness packet ==="
validate_packet "$OUT/mirrored-command-disclosure-readiness/command-disclosure-readiness.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-command-disclosure-readiness-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_V1_GREEN' "$OUT/published-command-disclosure-readiness.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_V1_GREEN' "$OUT/mirrored-command-disclosure-readiness.log"

echo
echo "peer_pin_command_disclosure_readiness_published_packet_green=true"
echo "peer_pin_command_disclosure_readiness_mirrored_packet_green=true"
echo "command_disclosure_readiness_approved_now=true"
echo "command_disclosure_readiness_terminal_release_recorded_now=true"
echo "command_disclosure_readiness_final_execute_released_now=true"
echo "command_disclosure_readiness_created_now=true"
echo "command_disclosure_readiness_exact_command_revealed_now=false"
echo "command_disclosure_readiness_exact_command_printed_now=false"
echo "command_disclosure_readiness_command_string_disclosed=false"
echo "command_disclosure_readiness_final_execute_allowed_now=false"
echo "command_disclosure_readiness_terminal_execute_allowed_now=false"
echo "command_disclosure_readiness_command_executed_now=false"
echo "command_disclosure_readiness_mirror_executed_now=false"
echo "command_disclosure_readiness_pin_executed_now=false"
echo "command_disclosure_readiness_public_mutation=false"
echo "command_disclosure_readiness_ledger_write=false"
echo "command_disclosure_readiness_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_READINESS_PACKET_PROOF_V1_GREEN"
