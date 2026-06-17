#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-final-execute-readiness-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Final Execute Readiness Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream backup restore readiness packets ==="
UPSTREAM_LOG="$OUT/upstream-backup-restore-readiness-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-backup-restore-readiness-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-backup-restore-readiness-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "final_execute_readiness_upstream_out_found=false"
  exit 1
fi

echo "final_execute_readiness_upstream_out_found=true"
echo "final_execute_readiness_upstream_out=$UPSTREAM_OUT"

PUBLISHED_RESTORE="$UPSTREAM_OUT/published-backup-restore-readiness/backup-restore-readiness.json"
MIRRORED_RESTORE="$UPSTREAM_OUT/mirrored-backup-restore-readiness/backup-restore-readiness.json"

for f in "$PUBLISHED_RESTORE" "$MIRRORED_RESTORE"; do
  if [ ! -f "$f" ]; then
    echo "final_execute_readiness_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published final execute readiness packet ==="
RESTORE_READINESS_FILE="$PUBLISHED_RESTORE" \
FINAL_EXECUTE_OPERATOR_LABEL="final-execute-readiness-proof-operator" \
OUT_DIR="$OUT/published-final-execute-readiness" \
ops/mainnet0/datanet-core-peer-pin-final-execute-readiness-packet-v1.sh | tee "$OUT/published-final-execute-readiness.log"

echo
echo "=== create mirrored final execute readiness packet ==="
RESTORE_READINESS_FILE="$MIRRORED_RESTORE" \
FINAL_EXECUTE_OPERATOR_LABEL="final-execute-readiness-proof-operator" \
OUT_DIR="$OUT/mirrored-final-execute-readiness" \
ops/mainnet0/datanet-core-peer-pin-final-execute-readiness-packet-v1.sh | tee "$OUT/mirrored-final-execute-readiness.log"

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

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_V1") fail("final_execute_readiness_marker_valid=false");
if (packet.ok !== true) fail("final_execute_readiness_ok=false");
if (packet.final_execute_readiness_state !== "final_execute_readiness_packet_created_no_execution") fail("final_execute_readiness_state_valid=false");
if (packet.selected_type !== expectedType) fail("final_execute_readiness_selected_type_valid=false");
if (!isSha(packet.final_execute_readiness_id)) fail("final_execute_readiness_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.final_execute_readiness_id;
delete copy.final_execute_readiness_id;
delete copy.final_execute_readiness_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("final_execute_readiness_id_hash_verified=false");

for (const key of [
  "restore_readiness_packet_valid",
  "restore_readiness_id_hash_verified",
  "restore_readiness_required_before_live_execute",
  "backup_snapshot_packet_valid",
  "backup_snapshot_id_hash_verified",
  "backup_snapshot_manifest_valid",
  "backup_snapshot_manifest_hash_verified",
  "pre_execution_backup_packet_valid",
  "manual_execute_packet_referenced_by_id",
  "terminal_execute_review_packet_referenced_by_id",
  "runtime_duplicate_guard_referenced_by_id",
  "command_packet_referenced_by_id",
  "restore_plan_created_now",
  "final_execute_readiness_created_now",
]) {
  if (packet.readiness_chain[key] !== true) fail(`final_execute_readiness_chain_${key}_not_true`);
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
  if (packet.execution_gate[key] !== false) fail(`final_execute_readiness_${key}_not_false`);
}

if (packet.command_disclosure_gate.exact_command_revealed_now !== false) fail("final_execute_readiness_exact_command_revealed_now_not_false");
if (packet.command_disclosure_gate.exact_command_printed_now !== false) fail("final_execute_readiness_exact_command_printed_now_not_false");
if (packet.command_disclosure_gate.command_string_disclosed !== false) fail("final_execute_readiness_command_string_disclosed_not_false");
if (packet.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("final_execute_readiness_command_packet_referenced_by_id=false");

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
  if (packet.public_safety[key] !== false) fail(`final_execute_readiness_safety_${key}_not_false`);
}

console.log("final_execute_readiness_marker_valid=true");
console.log("final_execute_readiness_id_hash_verified=true");
console.log("final_execute_readiness_selected_type=" + packet.selected_type);
console.log("final_execute_readiness_restore_readiness_required_before_live_execute=true");
console.log("final_execute_readiness_backup_snapshot_packet_valid=true");
console.log("final_execute_readiness_pre_execution_backup_packet_valid=true");
console.log("final_execute_readiness_command_packet_referenced_by_id=true");
console.log("final_execute_readiness_final_execute_allowed_now=false");
console.log("final_execute_readiness_command_executed_now=false");
console.log("final_execute_readiness_mirror_executed_now=false");
console.log("final_execute_readiness_pin_executed_now=false");
console.log("final_execute_readiness_backup_restore_executed_now=false");
console.log("final_execute_readiness_storage_snapshot_restored_now=false");
console.log("final_execute_readiness_public_mutation=false");
console.log("final_execute_readiness_ledger_write=false");
console.log("final_execute_readiness_wc_credit_award=false");
console.log("final_execute_readiness_command_string_disclosed=false");
NODE
}

echo
echo "=== validate published final execute readiness packet ==="
validate_packet "$OUT/published-final-execute-readiness/final-execute-readiness.json" "operator_published"

echo
echo "=== validate mirrored final execute readiness packet ==="
validate_packet "$OUT/mirrored-final-execute-readiness/final-execute-readiness.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-final-execute-readiness-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_V1_GREEN' "$OUT/published-final-execute-readiness.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_V1_GREEN' "$OUT/mirrored-final-execute-readiness.log"

echo
echo "peer_pin_final_execute_readiness_published_packet_green=true"
echo "peer_pin_final_execute_readiness_mirrored_packet_green=true"
echo "final_execute_readiness_required_before_live_execute=true"
echo "final_execute_readiness_final_execute_allowed_now=false"
echo "final_execute_readiness_command_executed_now=false"
echo "final_execute_readiness_mirror_executed_now=false"
echo "final_execute_readiness_pin_executed_now=false"
echo "final_execute_readiness_public_mutation=false"
echo "final_execute_readiness_ledger_write=false"
echo "final_execute_readiness_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_FINAL_EXECUTE_READINESS_PACKET_PROOF_V1_GREEN"
