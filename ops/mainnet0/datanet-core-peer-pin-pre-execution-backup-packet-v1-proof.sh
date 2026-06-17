#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${TMPDIR:-/tmp}/void-pre-execution-backup-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Pre-Execution Backup Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream manual execute packets ==="
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-manual-execute-packet-v1-proof.sh | tee "$OUT/upstream-manual-execute-proof.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_PROOF_V1_GREEN' "$OUT/upstream-manual-execute-proof.log"

UPSTREAM_OUT="$(awk -F= '/^out=/{print $2; exit}' "$OUT/upstream-manual-execute-proof.log")"

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "pre_execution_backup_upstream_out_found=false"
  exit 1
fi

echo "pre_execution_backup_upstream_out_found=true"
echo "pre_execution_backup_upstream_out=$UPSTREAM_OUT"

for f in \
  "$UPSTREAM_OUT/published-manual-execute/manual-execute.json" \
  "$UPSTREAM_OUT/mirrored-manual-execute/manual-execute.json"
do
  if [ ! -f "$f" ]; then
    echo "pre_execution_backup_upstream_manual_execute_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published pre-execution backup packet ==="
MANUAL_EXECUTE_FILE="$UPSTREAM_OUT/published-manual-execute/manual-execute.json" \
BACKUP_OPERATOR_LABEL=pre-execution-backup-proof-operator \
OUT_DIR="$OUT/published-pre-execution-backup" \
  ops/mainnet0/datanet-core-peer-pin-pre-execution-backup-packet-v1.sh | tee "$OUT/published-pre-execution-backup.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_V1_GREEN' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_manual_execute_id_hash_verified=true' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_command_packet_referenced_by_id=true' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_exact_command_revealed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_exact_command_printed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_command_string_disclosed=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_required=true' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_packet_created_now=true' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_created_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_manifest_created_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_storage_snapshot_created_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_manual_execute_allowed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_manual_execute_performed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_terminal_execute_allowed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_terminal_execute_performed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_shell_execution_performed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_command_executed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_mirror_executed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_pin_executed_now=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_public_mutation=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_ledger_write=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_wc_credit_award=false' "$OUT/published-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_private_leak_scan_green=true' "$OUT/published-pre-execution-backup.log"

echo
echo "=== create mirrored pre-execution backup packet ==="
MANUAL_EXECUTE_FILE="$UPSTREAM_OUT/mirrored-manual-execute/manual-execute.json" \
BACKUP_OPERATOR_LABEL=pre-execution-backup-proof-operator \
OUT_DIR="$OUT/mirrored-pre-execution-backup" \
  ops/mainnet0/datanet-core-peer-pin-pre-execution-backup-packet-v1.sh | tee "$OUT/mirrored-pre-execution-backup.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_V1_GREEN' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_manual_execute_id_hash_verified=true' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_command_packet_referenced_by_id=true' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_exact_command_revealed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_exact_command_printed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_command_string_disclosed=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_required=true' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_packet_created_now=true' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_created_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_manifest_created_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_storage_snapshot_created_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_manual_execute_allowed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_manual_execute_performed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_terminal_execute_allowed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_terminal_execute_performed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_shell_execution_performed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_command_executed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_mirror_executed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_pin_executed_now=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_public_mutation=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_ledger_write=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_wc_credit_award=false' "$OUT/mirrored-pre-execution-backup.log"
grep -Fq 'pre_execution_backup_private_leak_scan_green=true' "$OUT/mirrored-pre-execution-backup.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-pre-execution-backup-packet-v1.md

echo
echo "peer_pin_pre_execution_backup_published_packet_green=true"
echo "peer_pin_pre_execution_backup_mirrored_packet_green=true"
echo "pre_execution_backup_created_now=false"
echo "pre_execution_backup_public_mutation=false"
echo "pre_execution_backup_ledger_write=false"
echo "pre_execution_backup_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_PRE_EXECUTION_BACKUP_PACKET_PROOF_V1_GREEN"
