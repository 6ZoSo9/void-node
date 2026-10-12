#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${TMPDIR:-/tmp}/void-datanet-core-peer-pin-manual-execute-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Manual Execute Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

echo
echo "=== build upstream terminal execute review packets ==="
BASE="$BASE" ops/mainnet0/datanet-core-peer-pin-terminal-execute-review-packet-v1-proof.sh | tee "$OUT/upstream-terminal-review-proof.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_TERMINAL_EXECUTE_REVIEW_PACKET_PROOF_V1_GREEN' "$OUT/upstream-terminal-review-proof.log"

UPSTREAM_OUT="$(awk -F= '/^out=/{print $2; exit}' "$OUT/upstream-terminal-review-proof.log")"

if [ -z "$UPSTREAM_OUT" ] || [ ! -d "$UPSTREAM_OUT" ]; then
  echo "manual_execute_upstream_out_found=false"
  exit 1
fi

echo "manual_execute_upstream_out_found=true"
echo "manual_execute_upstream_out=$UPSTREAM_OUT"

for f in \
  "$UPSTREAM_OUT/published-terminal-review/terminal-execute-review.json" \
  "$UPSTREAM_OUT/mirrored-terminal-review/terminal-execute-review.json"
do
  if [ ! -f "$f" ]; then
    echo "manual_execute_upstream_terminal_review_file_exists=false"
    echo "missing=$f"
    exit 1
  fi
done

echo
echo "=== create published manual execute packet ==="
TERMINAL_EXECUTE_REVIEW_FILE="$UPSTREAM_OUT/published-terminal-review/terminal-execute-review.json" \
MANUAL_EXECUTE_OPERATOR_LABEL=pin-manual-execute-proof-operator \
OUT_DIR="$OUT/published-manual-execute" \
  ops/mainnet0/datanet-core-peer-pin-manual-execute-packet-v1.sh | tee "$OUT/published-manual-execute.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_V1_GREEN' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_terminal_review_id_hash_verified=true' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_command_packet_referenced_by_id=true' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_exact_command_revealed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_exact_command_printed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_command_string_disclosed=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_allowed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_performed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_terminal_execute_allowed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_terminal_execute_performed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_shell_execution_performed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_command_executed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_mirror_executed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_pin_executed_now=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_public_mutation=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_ledger_write=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_wc_credit_award=false' "$OUT/published-manual-execute.log"
grep -Fq 'manual_execute_private_leak_scan_green=true' "$OUT/published-manual-execute.log"

echo
echo "=== create mirrored manual execute packet ==="
TERMINAL_EXECUTE_REVIEW_FILE="$UPSTREAM_OUT/mirrored-terminal-review/terminal-execute-review.json" \
MANUAL_EXECUTE_OPERATOR_LABEL=pin-manual-execute-proof-operator \
OUT_DIR="$OUT/mirrored-manual-execute" \
  ops/mainnet0/datanet-core-peer-pin-manual-execute-packet-v1.sh | tee "$OUT/mirrored-manual-execute.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_V1_GREEN' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_terminal_review_id_hash_verified=true' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_mirrored_source_executor_required=true' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_command_packet_referenced_by_id=true' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_exact_command_revealed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_exact_command_printed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_command_string_disclosed=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_allowed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_performed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_terminal_execute_allowed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_terminal_execute_performed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_shell_execution_performed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_command_executed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_mirror_executed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_pin_executed_now=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_public_mutation=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_ledger_write=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_wc_credit_award=false' "$OUT/mirrored-manual-execute.log"
grep -Fq 'manual_execute_private_leak_scan_green=true' "$OUT/mirrored-manual-execute.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-manual-execute-packet-v1.md

echo
echo "peer_pin_manual_execute_published_packet_green=true"
echo "peer_pin_manual_execute_mirrored_executor_gap_green=true"
echo "manual_execute_public_mutation=false"
echo "manual_execute_ledger_write=false"
echo "manual_execute_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_MANUAL_EXECUTE_PACKET_PROOF_V1_GREEN"
