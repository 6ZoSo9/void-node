#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-backup-snapshot-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Backup Snapshot Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream pre-execution backup packets ==="
UPSTREAM_LOG="$OUT/upstream-pre-execution-backup-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-pre-execution-backup-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-pre-execution-backup-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "backup_snapshot_upstream_out_found=false"
  exit 1
fi

echo "backup_snapshot_upstream_out_found=true"
echo "backup_snapshot_upstream_out=$UPSTREAM_OUT"

PUBLISHED_PRE="$UPSTREAM_OUT/published-pre-execution-backup/pre-execution-backup.json"
MIRRORED_PRE="$UPSTREAM_OUT/mirrored-pre-execution-backup/pre-execution-backup.json"

for f in "$PUBLISHED_PRE" "$MIRRORED_PRE"; do
  if [ ! -f "$f" ]; then
    echo "backup_snapshot_required_pre_execution_backup_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published backup snapshot packet ==="
PRE_EXECUTION_BACKUP_FILE="$PUBLISHED_PRE" \
SNAPSHOT_OPERATOR_LABEL="backup-snapshot-proof-operator" \
OUT_DIR="$OUT/published-backup-snapshot" \
ops/mainnet0/datanet-core-peer-pin-backup-snapshot-packet-v1.sh | tee "$OUT/published-backup-snapshot.log"

echo
echo "=== create mirrored backup snapshot packet ==="
PRE_EXECUTION_BACKUP_FILE="$MIRRORED_PRE" \
SNAPSHOT_OPERATOR_LABEL="backup-snapshot-proof-operator" \
OUT_DIR="$OUT/mirrored-backup-snapshot" \
ops/mainnet0/datanet-core-peer-pin-backup-snapshot-packet-v1.sh | tee "$OUT/mirrored-backup-snapshot.log"

validate_packet() {
  local packet_file="$1"
  local manifest_file="$2"
  local expected_type="$3"

  node - "$packet_file" "$manifest_file" "$expected_type" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");

const packetFile = process.argv[2];
const manifestFile = process.argv[3];
const expectedType = process.argv[4];

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const packet = JSON.parse(fs.readFileSync(packetFile, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_V1") fail("backup_snapshot_marker_valid=false");
if (packet.ok !== true) fail("backup_snapshot_ok=false");
if (packet.backup_snapshot_state !== "backup_snapshot_packet_created_no_execution") fail("backup_snapshot_state_valid=false");
if (packet.selected_type !== expectedType) fail("backup_snapshot_selected_type_valid=false");
if (!isSha(packet.backup_snapshot_id)) fail("backup_snapshot_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.backup_snapshot_id;
delete copy.backup_snapshot_id;
delete copy.backup_snapshot_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("backup_snapshot_id_hash_verified=false");

if (manifest.manifest_marker !== "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_MANIFEST_V1") fail("backup_snapshot_manifest_marker_valid=false");
if (manifest.public_safe !== true) fail("backup_snapshot_manifest_public_safe=false");
if (hash(JSON.stringify(manifest, null, 2) + "\n") !== packet.backup_manifest.sha256) fail("backup_snapshot_manifest_hash_verified=false");

if (packet.validation.pre_execution_backup_packet_valid !== true) fail("backup_snapshot_pre_execution_backup_packet_valid=false");
if (packet.validation.pre_execution_backup_id_hash_verified !== true) fail("backup_snapshot_pre_execution_backup_id_hash_verified=false");
if (packet.validation.manual_execute_id_hash_verified !== true) fail("backup_snapshot_manual_execute_id_hash_verified=false");
if (packet.validation.command_packet_referenced_by_id !== true) fail("backup_snapshot_command_packet_referenced_by_id=false");
if (packet.validation.exact_command_revealed_now !== false) fail("backup_snapshot_exact_command_revealed_now_not_false");
if (packet.validation.exact_command_printed_now !== false) fail("backup_snapshot_exact_command_printed_now_not_false");
if (packet.validation.command_string_disclosed !== false) fail("backup_snapshot_command_string_disclosed_not_false");

for (const key of [
  "manual_execute_allowed_now",
  "manual_execute_performed_now",
  "terminal_execute_allowed_now",
  "terminal_execute_performed_now",
  "shell_execution_performed_now",
  "command_executed_now",
  "mirror_executed_now",
  "pin_executed_now",
  "automatic_execution_allowed",
]) {
  if (packet.execution_gate[key] !== false) fail(`backup_snapshot_${key}_not_false`);
}

if (packet.backup_manifest.created_now !== true) fail("backup_snapshot_manifest_created_now=false");
if (packet.backup_manifest.storage_snapshot_created_now !== false) fail("backup_snapshot_storage_snapshot_created_now_not_false");
if (packet.backup_manifest.storage_root_disclosed !== false) fail("backup_snapshot_storage_root_disclosed_not_false");
if (packet.backup_manifest.local_path_disclosed !== false) fail("backup_snapshot_local_path_disclosed_not_false");
if (packet.backup_manifest.absolute_path_disclosed !== false) fail("backup_snapshot_absolute_path_disclosed_not_false");
if (packet.backup_manifest.operator_home_path_disclosed !== false) fail("backup_snapshot_operator_home_path_disclosed_not_false");

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
  "absolute_path_disclosed",
  "operator_home_path_disclosed",
  "local_storage_root_disclosed",
]) {
  if (packet.public_safety[key] !== false) fail(`backup_snapshot_safety_${key}_not_false`);
}

console.log("backup_snapshot_marker_valid=true");
console.log("backup_snapshot_id_hash_verified=true");
console.log("backup_snapshot_manifest_marker_valid=true");
console.log("backup_snapshot_manifest_hash_verified=true");
console.log("backup_snapshot_selected_type=" + packet.selected_type);
console.log("backup_snapshot_command_string_disclosed=false");
console.log("backup_snapshot_storage_snapshot_created_now=false");
console.log("backup_snapshot_manual_execute_allowed_now=false");
console.log("backup_snapshot_manual_execute_performed_now=false");
console.log("backup_snapshot_terminal_execute_allowed_now=false");
console.log("backup_snapshot_terminal_execute_performed_now=false");
console.log("backup_snapshot_shell_execution_performed_now=false");
console.log("backup_snapshot_command_executed_now=false");
console.log("backup_snapshot_mirror_executed_now=false");
console.log("backup_snapshot_pin_executed_now=false");
console.log("backup_snapshot_public_mutation=false");
console.log("backup_snapshot_ledger_write=false");
console.log("backup_snapshot_wc_credit_award=false");
NODE
}

echo
echo "=== validate published backup snapshot packet ==="
validate_packet \
  "$OUT/published-backup-snapshot/backup-snapshot.json" \
  "$OUT/published-backup-snapshot/backup-snapshot-manifest.json" \
  "operator_published"

echo
echo "=== validate mirrored backup snapshot packet ==="
validate_packet \
  "$OUT/mirrored-backup-snapshot/backup-snapshot.json" \
  "$OUT/mirrored-backup-snapshot/backup-snapshot-manifest.json" \
  "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-backup-snapshot-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_V1_GREEN' "$OUT/published-backup-snapshot.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_V1_GREEN' "$OUT/mirrored-backup-snapshot.log"

echo
echo "peer_pin_backup_snapshot_published_packet_green=true"
echo "peer_pin_backup_snapshot_mirrored_packet_green=true"
echo "backup_snapshot_manifest_created_now=true"
echo "backup_snapshot_storage_snapshot_created_now=false"
echo "backup_snapshot_public_mutation=false"
echo "backup_snapshot_ledger_write=false"
echo "backup_snapshot_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_BACKUP_SNAPSHOT_PACKET_PROOF_V1_GREEN"
