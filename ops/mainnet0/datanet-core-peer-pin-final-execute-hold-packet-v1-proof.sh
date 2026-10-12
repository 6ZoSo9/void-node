#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-final-execute-hold-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Final Execute Hold Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream final execute readiness packets ==="
UPSTREAM_LOG="$OUT/upstream-final-execute-readiness-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-final-execute-readiness-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-final-execute-readiness-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "final_execute_hold_upstream_out_found=false"
  exit 1
fi

echo "final_execute_hold_upstream_out_found=true"
echo "final_execute_hold_upstream_out=$UPSTREAM_OUT"

PUBLISHED_READINESS="$UPSTREAM_OUT/published-final-execute-readiness/final-execute-readiness.json"
MIRRORED_READINESS="$UPSTREAM_OUT/mirrored-final-execute-readiness/final-execute-readiness.json"

for f in "$PUBLISHED_READINESS" "$MIRRORED_READINESS"; do
  if [ ! -f "$f" ]; then
    echo "final_execute_hold_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published final execute hold packet ==="
FINAL_EXECUTE_READINESS_FILE="$PUBLISHED_READINESS" \
FINAL_EXECUTE_HOLD_OPERATOR_LABEL="final-execute-hold-proof-operator" \
OUT_DIR="$OUT/published-final-execute-hold" \
ops/mainnet0/datanet-core-peer-pin-final-execute-hold-packet-v1.sh | tee "$OUT/published-final-execute-hold.log"

echo
echo "=== create mirrored final execute hold packet ==="
FINAL_EXECUTE_READINESS_FILE="$MIRRORED_READINESS" \
FINAL_EXECUTE_HOLD_OPERATOR_LABEL="final-execute-hold-proof-operator" \
OUT_DIR="$OUT/mirrored-final-execute-hold" \
ops/mainnet0/datanet-core-peer-pin-final-execute-hold-packet-v1.sh | tee "$OUT/mirrored-final-execute-hold.log"

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

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_V1") fail("final_execute_hold_marker_valid=false");
if (packet.ok !== true) fail("final_execute_hold_ok=false");
if (packet.final_execute_hold_state !== "final_execute_hold_packet_created_execution_still_held") fail("final_execute_hold_state_valid=false");
if (packet.selected_type !== expectedType) fail("final_execute_hold_selected_type_valid=false");
if (!isSha(packet.final_execute_hold_id)) fail("final_execute_hold_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.final_execute_hold_id;
delete copy.final_execute_hold_id;
delete copy.final_execute_hold_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("final_execute_hold_id_hash_verified=false");

for (const key of [
  "readiness_packet_valid",
  "readiness_id_hash_verified",
  "readiness_chain_complete",
  "final_execute_hold_required",
]) {
  if (packet.hold_boundary[key] !== true) fail(`final_execute_hold_boundary_${key}_not_true`);
}

for (const key of [
  "final_execute_released_now",
  "operator_release_recorded_now",
  "terminal_release_recorded_now",
  "final_execute_allowed_now",
]) {
  if (packet.hold_boundary[key] !== false) fail(`final_execute_hold_boundary_${key}_not_false`);
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
  if (packet.execution_gate[key] !== false) fail(`final_execute_hold_${key}_not_false`);
}

if (packet.command_disclosure_gate.exact_command_revealed_now !== false) fail("final_execute_hold_exact_command_revealed_now_not_false");
if (packet.command_disclosure_gate.exact_command_printed_now !== false) fail("final_execute_hold_exact_command_printed_now_not_false");
if (packet.command_disclosure_gate.command_string_disclosed !== false) fail("final_execute_hold_command_string_disclosed_not_false");
if (packet.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("final_execute_hold_command_packet_referenced_by_id=false");

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
  if (packet.public_safety[key] !== false) fail(`final_execute_hold_safety_${key}_not_false`);
}

console.log("final_execute_hold_marker_valid=true");
console.log("final_execute_hold_id_hash_verified=true");
console.log("final_execute_hold_selected_type=" + packet.selected_type);
console.log("final_execute_hold_required=true");
console.log("final_execute_hold_final_execute_released_now=false");
console.log("final_execute_hold_operator_release_recorded_now=false");
console.log("final_execute_hold_terminal_release_recorded_now=false");
console.log("final_execute_hold_final_execute_allowed_now=false");
console.log("final_execute_hold_command_executed_now=false");
console.log("final_execute_hold_mirror_executed_now=false");
console.log("final_execute_hold_pin_executed_now=false");
console.log("final_execute_hold_backup_restore_executed_now=false");
console.log("final_execute_hold_storage_snapshot_restored_now=false");
console.log("final_execute_hold_public_mutation=false");
console.log("final_execute_hold_ledger_write=false");
console.log("final_execute_hold_wc_credit_award=false");
console.log("final_execute_hold_command_string_disclosed=false");
NODE
}

echo
echo "=== validate published final execute hold packet ==="
validate_packet "$OUT/published-final-execute-hold/final-execute-hold.json" "operator_published"

echo
echo "=== validate mirrored final execute hold packet ==="
validate_packet "$OUT/mirrored-final-execute-hold/final-execute-hold.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-final-execute-hold-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_V1_GREEN' "$OUT/published-final-execute-hold.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_V1_GREEN' "$OUT/mirrored-final-execute-hold.log"

echo
echo "peer_pin_final_execute_hold_published_packet_green=true"
echo "peer_pin_final_execute_hold_mirrored_packet_green=true"
echo "final_execute_hold_required=true"
echo "final_execute_hold_final_execute_released_now=false"
echo "final_execute_hold_final_execute_allowed_now=false"
echo "final_execute_hold_command_executed_now=false"
echo "final_execute_hold_mirror_executed_now=false"
echo "final_execute_hold_pin_executed_now=false"
echo "final_execute_hold_public_mutation=false"
echo "final_execute_hold_ledger_write=false"
echo "final_execute_hold_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_HOLD_PACKET_PROOF_V1_GREEN"
