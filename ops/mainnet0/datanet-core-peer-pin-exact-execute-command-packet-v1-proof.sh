#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-peer-pin-exact-execute-command-packet-fixture-v1"
MIRROR_NODE_LABEL="peer-pin-exact-execute-command-packet-proof-node"
OUT="${TMPDIR:-/tmp}/void-datanet-core-peer-pin-exact-execute-command-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID DataNet Core Peer Pin Exact Execute Command Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Peer Pin Exact Execute Command Packet fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_FIXTURE_V1","ok":true,"purpose":"peer-pin-exact-execute-command-packet"}\n' > "$SRC/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" > "$OUT/publish.log"

grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN' "$OUT/publish.log"

BASE="$BASE" \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  ops/mainnet0/datanet-core-mirror-loop-v1.sh > "$OUT/mirror-loop.log"

grep -Fq 'VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN' "$OUT/mirror-loop.log"

make_approval() {
  local mode="$1"
  local label="$2"

  OUT_DIR="$OUT/${label}-pin-request" \
  PEER_BASE="$BASE" \
  SELECT_MODE="$mode" \
  DATASET_ID="$DATASET_ID" \
  MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  REQUESTER_NODE_LABEL=pin-exact-command-proof-requester \
  TARGET_NODE_LABEL=pin-exact-command-proof-target \
    ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/${label}-pin-request.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/${label}-pin-request.log"

  PIN_REQUEST_FILE="$OUT/${label}-pin-request/pin-request.json" \
  SOURCE_PEER_BASE="$BASE" \
  REVIEWER_NODE_LABEL=pin-exact-command-proof-reviewer \
  OUT_DIR="$OUT/${label}-pin-review" \
    ops/mainnet0/datanet-core-peer-pin-review-v1.sh > "$OUT/${label}-pin-review.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN' "$OUT/${label}-pin-review.log"

  PIN_REVIEW_FILE="$OUT/${label}-pin-review/pin-review.json" \
  DRY_RUN_OPERATOR_LABEL=pin-exact-command-proof-operator \
  OUT_DIR="$OUT/${label}-dry-run" \
    ops/mainnet0/datanet-core-peer-pin-execute-dry-run-v1.sh > "$OUT/${label}-dry-run.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1_GREEN' "$OUT/${label}-dry-run.log"

  PIN_DRY_RUN_PLAN_FILE="$OUT/${label}-dry-run/dry-run-plan.json" \
  SOURCE_PEER_BASE="$BASE" \
  LOCAL_BASE="$BASE" \
  PREFLIGHT_OPERATOR_LABEL=pin-exact-command-proof-operator \
  OUT_DIR="$OUT/${label}-final-preflight" \
    ops/mainnet0/datanet-core-peer-pin-final-preflight-v1.sh > "$OUT/${label}-final-preflight.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1_GREEN' "$OUT/${label}-final-preflight.log"

  FINAL_PREFLIGHT_FILE="$OUT/${label}-final-preflight/final-preflight.json" \
  OPERATOR_APPROVAL_LABEL=pin-exact-command-proof-operator \
  OUT_DIR="$OUT/${label}-operator-approval" \
    ops/mainnet0/datanet-core-peer-pin-operator-approval-packet-v1.sh > "$OUT/${label}-operator-approval.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1_GREEN' "$OUT/${label}-operator-approval.log"
}

make_approval published published
make_approval mirrored mirrored

OPERATOR_APPROVAL_FILE="$OUT/published-operator-approval/operator-approval.json" \
SOURCE_PEER_BASE="$BASE" \
EXECUTE_OPERATOR_LABEL=pin-exact-command-proof-operator \
OUT_DIR="$OUT/published-exact-command" \
  ops/mainnet0/datanet-core-peer-pin-exact-execute-command-packet-v1.sh > "$OUT/published-exact-command.log"

cat "$OUT/published-exact-command.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_V1_GREEN' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_approval_id_hash_verified=true' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_current_executor_supports_selected_type=true' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_rendered_now=true' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_executed_now=false' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_execution_allowed_now=false' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_mirror_executed_now=false' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_pin_executed_now=false' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_public_mutation=false' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_ledger_write=false' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_wc_credit_award=false' "$OUT/published-exact-command.log"
grep -Fq 'exact_execute_command_private_leak_scan_green=true' "$OUT/published-exact-command.log"

OPERATOR_APPROVAL_FILE="$OUT/mirrored-operator-approval/operator-approval.json" \
SOURCE_PEER_BASE="$BASE" \
EXECUTE_OPERATOR_LABEL=pin-exact-command-proof-operator \
OUT_DIR="$OUT/mirrored-exact-command" \
  ops/mainnet0/datanet-core-peer-pin-exact-execute-command-packet-v1.sh > "$OUT/mirrored-exact-command.log"

cat "$OUT/mirrored-exact-command.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_V1_GREEN' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_approval_id_hash_verified=true' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_current_executor_supports_selected_type=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_mirrored_source_executor_required=true' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_rendered_now=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_executed_now=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_execution_allowed_now=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_mirror_executed_now=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_pin_executed_now=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_public_mutation=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_ledger_write=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_wc_credit_award=false' "$OUT/mirrored-exact-command.log"
grep -Fq 'exact_execute_command_private_leak_scan_green=true' "$OUT/mirrored-exact-command.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-exact-execute-command-packet-v1.md

echo "peer_pin_exact_execute_command_published_packet_green=true"
echo "peer_pin_exact_execute_command_mirrored_executor_gap_green=true"
echo "exact_execute_command_public_mutation=false"
echo "exact_execute_command_ledger_write=false"
echo "exact_execute_command_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_PROOF_V1_GREEN"
