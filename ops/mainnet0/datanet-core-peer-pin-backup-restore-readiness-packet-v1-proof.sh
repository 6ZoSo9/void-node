#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-${TMPDIR:-/tmp}/void-backup-restore-readiness-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Backup Restore Readiness Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream backup snapshot packets ==="
UPSTREAM_LOG="$OUT/upstream-backup-snapshot-proof.log"
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-backup-snapshot-packet-v1-proof.sh | tee "$UPSTREAM_LOG"

UPSTREAM_OUT="$(awk -F= '/^out=\/tmp\/void-backup-snapshot-packet-v1-proof-/ {print $2; exit}' "$UPSTREAM_LOG")"
if [ -z "$UPSTREAM_OUT" ]; then
  UPSTREAM_OUT="$(awk -F= '/^out=/ {print $2; exit}' "$UPSTREAM_LOG")"
fi

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "backup_restore_readiness_upstream_out_found=false"
  exit 1
fi

echo "backup_restore_readiness_upstream_out_found=true"
echo "backup_restore_readiness_upstream_out=$UPSTREAM_OUT"

PUBLISHED_SNAPSHOT="$UPSTREAM_OUT/published-backup-snapshot/backup-snapshot.json"
PUBLISHED_MANIFEST="$UPSTREAM_OUT/published-backup-snapshot/backup-snapshot-manifest.json"
MIRRORED_SNAPSHOT="$UPSTREAM_OUT/mirrored-backup-snapshot/backup-snapshot.json"
MIRRORED_MANIFEST="$UPSTREAM_OUT/mirrored-backup-snapshot/backup-snapshot-manifest.json"

for f in "$PUBLISHED_SNAPSHOT" "$PUBLISHED_MANIFEST" "$MIRRORED_SNAPSHOT" "$MIRRORED_MANIFEST"; do
  if [ ! -f "$f" ]; then
    echo "backup_restore_readiness_required_upstream_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published backup restore readiness packet ==="
BACKUP_SNAPSHOT_FILE="$PUBLISHED_SNAPSHOT" \
BACKUP_SNAPSHOT_MANIFEST_FILE="$PUBLISHED_MANIFEST" \
RESTORE_OPERATOR_LABEL="backup-restore-readiness-proof-operator" \
OUT_DIR="$OUT/published-backup-restore-readiness" \
ops/mainnet0/datanet-core-peer-pin-backup-restore-readiness-packet-v1.sh | tee "$OUT/published-backup-restore-readiness.log"

echo
echo "=== create mirrored backup restore readiness packet ==="
BACKUP_SNAPSHOT_FILE="$MIRRORED_SNAPSHOT" \
BACKUP_SNAPSHOT_MANIFEST_FILE="$MIRRORED_MANIFEST" \
RESTORE_OPERATOR_LABEL="backup-restore-readiness-proof-operator" \
OUT_DIR="$OUT/mirrored-backup-restore-readiness" \
ops/mainnet0/datanet-core-peer-pin-backup-restore-readiness-packet-v1.sh | tee "$OUT/mirrored-backup-restore-readiness.log"

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

if (packet.marker !== "VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_V1") fail("backup_restore_readiness_marker_valid=false");
if (packet.ok !== true) fail("backup_restore_readiness_ok=false");
if (packet.backup_restore_readiness_state !== "restore_readiness_packet_created_no_restore_no_execution") fail("backup_restore_readiness_state_valid=false");
if (packet.selected_type !== expectedType) fail("backup_restore_readiness_selected_type_valid=false");
if (!isSha(packet.backup_restore_readiness_id)) fail("backup_restore_readiness_id_valid=false");

const copy = JSON.parse(JSON.stringify(packet));
const id = copy.backup_restore_readiness_id;
delete copy.backup_restore_readiness_id;
delete copy.backup_restore_readiness_id_scope;
if (hash(JSON.stringify(copy, null, 2) + "\n") !== id) fail("backup_restore_readiness_id_hash_verified=false");

if (packet.restore_boundary.restore_readiness_required_before_live_execute !== true) fail("backup_restore_readiness_required_before_live_execute=false");
if (packet.restore_boundary.backup_snapshot_packet_valid !== true) fail("backup_restore_readiness_backup_snapshot_packet_valid=false");
if (packet.restore_boundary.backup_snapshot_id_hash_verified !== true) fail("backup_restore_readiness_backup_snapshot_id_hash_verified=false");
if (packet.restore_boundary.backup_snapshot_manifest_valid !== true) fail("backup_restore_readiness_backup_snapshot_manifest_valid=false");
if (packet.restore_boundary.backup_snapshot_manifest_hash_verified !== true) fail("backup_restore_readiness_backup_snapshot_manifest_hash_verified=false");
if (packet.restore_boundary.pre_execution_backup_packet_valid !== true) fail("backup_restore_readiness_pre_execution_backup_packet_valid=false");
if (packet.restore_boundary.command_packet_referenced_by_id !== true) fail("backup_restore_readiness_command_packet_referenced_by_id=false");
if (packet.restore_boundary.restore_plan_created_now !== true) fail("backup_restore_readiness_restore_plan_created_now=false");
if (packet.restore_boundary.backup_restore_executed_now !== false) fail("backup_restore_readiness_backup_restore_executed_now_not_false");
if (packet.restore_boundary.storage_snapshot_restored_now !== false) fail("backup_restore_readiness_storage_snapshot_restored_now_not_false");
if (packet.restore_boundary.live_state_changed_now !== false) fail("backup_restore_readiness_live_state_changed_now_not_false");
if (packet.restore_boundary.restore_path_disclosed !== false) fail("backup_restore_readiness_restore_path_disclosed_not_false");

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
  if (packet.execution_gate[key] !== false) fail(`backup_restore_readiness_${key}_not_false`);
}

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
  if (packet.public_safety[key] !== false) fail(`backup_restore_readiness_safety_${key}_not_false`);
}

console.log("backup_restore_readiness_marker_valid=true");
console.log("backup_restore_readiness_id_hash_verified=true");
console.log("backup_restore_readiness_selected_type=" + packet.selected_type);
console.log("backup_restore_readiness_required_before_live_execute=true");
console.log("backup_restore_readiness_backup_snapshot_id_hash_verified=true");
console.log("backup_restore_readiness_restore_plan_created_now=true");
console.log("backup_restore_readiness_backup_restore_executed_now=false");
console.log("backup_restore_readiness_storage_snapshot_restored_now=false");
console.log("backup_restore_readiness_live_state_changed_now=false");
console.log("backup_restore_readiness_command_executed_now=false");
console.log("backup_restore_readiness_mirror_executed_now=false");
console.log("backup_restore_readiness_pin_executed_now=false");
console.log("backup_restore_readiness_public_mutation=false");
console.log("backup_restore_readiness_ledger_write=false");
console.log("backup_restore_readiness_wc_credit_award=false");
NODE
}

echo
echo "=== validate published backup restore readiness packet ==="
validate_packet "$OUT/published-backup-restore-readiness/backup-restore-readiness.json" "operator_published"

echo
echo "=== validate mirrored backup restore readiness packet ==="
validate_packet "$OUT/mirrored-backup-restore-readiness/backup-restore-readiness.json" "mirrored"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-backup-restore-readiness-packet-v1.md
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_V1_GREEN' "$OUT/published-backup-restore-readiness.log"
grep -Fq 'VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_V1_GREEN' "$OUT/mirrored-backup-restore-readiness.log"

echo
echo "peer_pin_backup_restore_readiness_published_packet_green=true"
echo "peer_pin_backup_restore_readiness_mirrored_packet_green=true"
echo "backup_restore_readiness_required_before_live_execute=true"
echo "backup_restore_readiness_backup_restore_executed_now=false"
echo "backup_restore_readiness_storage_snapshot_restored_now=false"
echo "backup_restore_readiness_public_mutation=false"
echo "backup_restore_readiness_ledger_write=false"
echo "backup_restore_readiness_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_BACKUP_RESTORE_READINESS_PACKET_PROOF_V1_GREEN"
