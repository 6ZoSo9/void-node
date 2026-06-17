#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-command-disclosure-review-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Command Disclosure Review Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_REVIEW_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream command disclosure readiness packets ==="
UPSTREAM_LOG="$OUT/upstream-command-disclosure-readiness-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-command-disclosure-readiness-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-command-disclosure-readiness-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "command_disclosure_review_upstream_out_found=false"
  exit 1
fi

echo "command_disclosure_review_upstream_out_found=true"
echo "command_disclosure_review_upstream_out=$UPSTREAM_OUT"

PUBLISHED_READINESS="$UPSTREAM_OUT/published-command-disclosure-readiness/command-disclosure-readiness.json"
MIRRORED_READINESS="$UPSTREAM_OUT/mirrored-command-disclosure-readiness/command-disclosure-readiness.json"

for f in "$PUBLISHED_READINESS" "$MIRRORED_READINESS"; do
  if [ ! -f "$f" ]; then
    echo "command_disclosure_review_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published command disclosure review packet ==="
COMMAND_DISCLOSURE_READINESS_FILE="$PUBLISHED_READINESS" \
COMMAND_DISCLOSURE_REVIEW_OPERATOR_LABEL="command-disclosure-review-proof-operator" \
OUT_DIR="$OUT/published-command-disclosure-review" \
ops/mainnet0/datanet-core-peer-pin-command-disclosure-review-packet-v1.sh | tee "$OUT/published-command-disclosure-review.log"

echo
echo "=== create mirrored command disclosure review packet ==="
COMMAND_DISCLOSURE_READINESS_FILE="$MIRRORED_READINESS" \
COMMAND_DISCLOSURE_REVIEW_OPERATOR_LABEL="command-disclosure-review-proof-operator" \
OUT_DIR="$OUT/mirrored-command-disclosure-review" \
ops/mainnet0/datanet-core-peer-pin-command-disclosure-review-packet-v1.sh | tee "$OUT/mirrored-command-disclosure-review.log"

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

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_REVIEW_PACKET_V1") fail("command_disclosure_review_marker_valid=false");
if (packet.ok !== true) fail("command_disclosure_review_ok=false");
if (packet.command_disclosure_review_state !== "command_disclosure_review_performed_command_still_withheld_execution_not_performed") fail("command_disclosure_review_state_valid=false");
if (packet.selected_type !== expectedType) fail("command_disclosure_review_selected_type_valid=false");
if (!isSha(packet.command_disclosure_review_id)) fail("command_disclosure_review_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.command_disclosure_review_id;
delete copy.command_disclosure_review_id;
delete copy.command_disclosure_review_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("command_disclosure_review_id_hash_verified=false");

const b = packet.command_disclosure_review_boundary;
if (b.command_disclosure_readiness_packet_valid !== true) fail("command_disclosure_review_readiness_packet_valid=false");
if (b.command_disclosure_readiness_id_hash_verified !== true) fail("command_disclosure_review_readiness_id_hash_verified=false");
if (b.operator_release_approved_now !== true) fail("command_disclosure_review_operator_release_approved_now=false");
if (b.terminal_release_recorded_now !== true) fail("command_disclosure_review_terminal_release_recorded_now=false");
if (b.final_execute_released_now !== true) fail("command_disclosure_review_final_execute_released_now=false");
if (b.command_disclosure_readiness_created_now !== true) fail("command_disclosure_review_readiness_created_now=false");
if (b.command_disclosure_review_performed_now !== true) fail("command_disclosure_review_performed_now=false");
if (b.command_disclosure_approved_now !== false) fail("command_disclosure_review_approved_now_not_false");
if (b.exact_command_revealed_now !== false) fail("command_disclosure_review_exact_command_revealed_now_not_false");
if (b.exact_command_printed_now !== false) fail("command_disclosure_review_exact_command_printed_now_not_false");
if (b.command_string_disclosed !== false) fail("command_disclosure_review_command_string_disclosed_not_false");
if (b.final_execute_allowed_now !== false) fail("command_disclosure_review_final_execute_allowed_now_not_false");
if (b.terminal_execute_allowed_now !== false) fail("command_disclosure_review_terminal_execute_allowed_now_not_false");

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
  if (packet.execution_gate[key] !== false) fail(`command_disclosure_review_${key}_not_false`);
}

if (packet.command_disclosure_gate.exact_command_revealed_now !== false) fail("command_disclosure_review_gate_exact_command_revealed_now_not_false");
if (packet.command_disclosure_gate.exact_command_printed_now !== false) fail("command_disclosure_review_gate_exact_command_printed_now_not_false");
if (packet.command_disclosure_gate.command_string_disclosed !== false) fail("command_disclosure_review_gate_command_string_disclosed_not_false");
if (packet.command_disclosure_gate.command_packet_referenced_by_id !== true) fail("command_disclosure_review_command_packet_referenced_by_id=false");

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
  if (packet.public_safety[key] !== false) fail(`command_disclosure_review_safety_${key}_not_false`);
}

console.log("command_disclosure_review_marker_valid=true");
console.log("command_disclosure_review_id_hash_verified=true");
console.log("command_disclosure_review_selected_type=" + packet.selected_type);
console.log("command_disclosure_review_readiness_created_now=true");
console.log("command_disclosure_review_performed_now=true");
console.log("command_disclosure_review_approved_now=false");
console.log("command_disclosure_review_exact_command_revealed_now=false");
console.log("command_disclosure_review_exact_command_printed_now=false");
console.log("command_disclosure_review_command_string_disclosed=false");
console.log("command_disclosure_review_final_execute_allowed_now=false");
console.log("command_disclosure_review_terminal_execute_allowed_now=false");
console.log("command_disclosure_review_command_executed_now=false");
console.log("command_disclosure_review_mirror_executed_now=false");
console.log("command_disclosure_review_pin_executed_now=false");
console.log("command_disclosure_review_public_mutation=false");
console.log("command_disclosure_review_ledger_write=false");
console.log("command_disclosure_review_wc_credit_award=false");
NODE
}

echo
echo "=== validate published command disclosure review packet ==="
validate_packet "$OUT/published-command-disclosure-review/command-disclosure-review.json" "operator_published"

echo
echo "=== validate mirrored command disclosure review packet ==="
validate_packet "$OUT/mirrored-command-disclosure-review/command-disclosure-review.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_REVIEW_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-command-disclosure-review-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_REVIEW_PACKET_V1_GREEN' "$OUT/published-command-disclosure-review.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_REVIEW_PACKET_V1_GREEN' "$OUT/mirrored-command-disclosure-review.log"

echo
echo "peer_pin_command_disclosure_review_published_packet_green=true"
echo "peer_pin_command_disclosure_review_mirrored_packet_green=true"
echo "command_disclosure_review_readiness_created_now=true"
echo "command_disclosure_review_performed_now=true"
echo "command_disclosure_review_approved_now=false"
echo "command_disclosure_review_exact_command_revealed_now=false"
echo "command_disclosure_review_exact_command_printed_now=false"
echo "command_disclosure_review_command_string_disclosed=false"
echo "command_disclosure_review_final_execute_allowed_now=false"
echo "command_disclosure_review_terminal_execute_allowed_now=false"
echo "command_disclosure_review_command_executed_now=false"
echo "command_disclosure_review_mirror_executed_now=false"
echo "command_disclosure_review_pin_executed_now=false"
echo "command_disclosure_review_public_mutation=false"
echo "command_disclosure_review_ledger_write=false"
echo "command_disclosure_review_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_COMMAND_DISCLOSURE_REVIEW_PACKET_PROOF_V1_GREEN"
