#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-peer-pin-operator-approval-packet-fixture-v1"
MIRROR_NODE_LABEL="peer-pin-operator-approval-packet-proof-node"
OUT="${TMPDIR:-/tmp}/void-datanet-core-peer-pin-operator-approval-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID DataNet Core Peer Pin Operator Approval Packet v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Peer Pin Operator Approval Packet fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_FIXTURE_V1","ok":true,"purpose":"peer-pin-operator-approval-packet"}\n' > "$SRC/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" > "$OUT/publish.log"

grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN' "$OUT/publish.log"

BASE="$BASE" \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  ops/mainnet0/datanet-core-mirror-loop-v1.sh > "$OUT/mirror-loop.log"

grep -Fq 'VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN' "$OUT/mirror-loop.log"

OUT_DIR="$OUT/published-pin-request" \
PEER_BASE="$BASE" \
SELECT_MODE=published \
DATASET_ID="$DATASET_ID" \
REQUESTER_NODE_LABEL=pin-operator-approval-proof-requester \
TARGET_NODE_LABEL=pin-operator-approval-proof-target \
  ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/published-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/published-pin-request.log"

OUT_DIR="$OUT/mirrored-pin-request" \
PEER_BASE="$BASE" \
SELECT_MODE=mirrored \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
REQUESTER_NODE_LABEL=pin-operator-approval-proof-requester \
TARGET_NODE_LABEL=pin-operator-approval-proof-target \
  ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/mirrored-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/mirrored-pin-request.log"

PIN_REQUEST_FILE="$OUT/published-pin-request/pin-request.json" \
SOURCE_PEER_BASE="$BASE" \
REVIEWER_NODE_LABEL=pin-operator-approval-proof-reviewer \
OUT_DIR="$OUT/published-pin-review" \
  ops/mainnet0/datanet-core-peer-pin-review-v1.sh > "$OUT/published-pin-review.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN' "$OUT/published-pin-review.log"

PIN_REQUEST_FILE="$OUT/mirrored-pin-request/pin-request.json" \
SOURCE_PEER_BASE="$BASE" \
REVIEWER_NODE_LABEL=pin-operator-approval-proof-reviewer \
OUT_DIR="$OUT/mirrored-pin-review" \
  ops/mainnet0/datanet-core-peer-pin-review-v1.sh > "$OUT/mirrored-pin-review.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN' "$OUT/mirrored-pin-review.log"

PIN_REVIEW_FILE="$OUT/published-pin-review/pin-review.json" \
DRY_RUN_OPERATOR_LABEL=pin-operator-approval-proof-operator \
OUT_DIR="$OUT/published-dry-run" \
  ops/mainnet0/datanet-core-peer-pin-execute-dry-run-v1.sh > "$OUT/published-dry-run.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1_GREEN' "$OUT/published-dry-run.log"

PIN_REVIEW_FILE="$OUT/mirrored-pin-review/pin-review.json" \
DRY_RUN_OPERATOR_LABEL=pin-operator-approval-proof-operator \
OUT_DIR="$OUT/mirrored-dry-run" \
  ops/mainnet0/datanet-core-peer-pin-execute-dry-run-v1.sh > "$OUT/mirrored-dry-run.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1_GREEN' "$OUT/mirrored-dry-run.log"

PIN_DRY_RUN_PLAN_FILE="$OUT/published-dry-run/dry-run-plan.json" \
SOURCE_PEER_BASE="$BASE" \
LOCAL_BASE="$BASE" \
PREFLIGHT_OPERATOR_LABEL=pin-operator-approval-proof-operator \
OUT_DIR="$OUT/published-final-preflight" \
  ops/mainnet0/datanet-core-peer-pin-final-preflight-v1.sh > "$OUT/published-final-preflight.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1_GREEN' "$OUT/published-final-preflight.log"

PIN_DRY_RUN_PLAN_FILE="$OUT/mirrored-dry-run/dry-run-plan.json" \
SOURCE_PEER_BASE="$BASE" \
LOCAL_BASE="$BASE" \
PREFLIGHT_OPERATOR_LABEL=pin-operator-approval-proof-operator \
OUT_DIR="$OUT/mirrored-final-preflight" \
  ops/mainnet0/datanet-core-peer-pin-final-preflight-v1.sh > "$OUT/mirrored-final-preflight.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1_GREEN' "$OUT/mirrored-final-preflight.log"

FINAL_PREFLIGHT_FILE="$OUT/published-final-preflight/final-preflight.json" \
OPERATOR_APPROVAL_LABEL=pin-operator-approval-proof-operator \
OUT_DIR="$OUT/published-operator-approval" \
  ops/mainnet0/datanet-core-peer-pin-operator-approval-packet-v1.sh > "$OUT/published-operator-approval.log"

cat "$OUT/published-operator-approval.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1_GREEN' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_preflight_id_hash_verified=true' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_duplicate_local_availability_check_performed=true' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_source_peer_reachable=true' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_final_peer_content_verify_green=true' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_recorded_now=true' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_execution_allowed_now=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_execute_packet_created_now=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_command_rendered_now=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_command_executed_now=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_mirror_executed_now=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_pin_executed_now=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_public_mutation=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_ledger_write=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_wc_credit_award=false' "$OUT/published-operator-approval.log"
grep -Fq 'operator_approval_private_leak_scan_green=true' "$OUT/published-operator-approval.log"

FINAL_PREFLIGHT_FILE="$OUT/mirrored-final-preflight/final-preflight.json" \
OPERATOR_APPROVAL_LABEL=pin-operator-approval-proof-operator \
OUT_DIR="$OUT/mirrored-operator-approval" \
  ops/mainnet0/datanet-core-peer-pin-operator-approval-packet-v1.sh > "$OUT/mirrored-operator-approval.log"

cat "$OUT/mirrored-operator-approval.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1_GREEN' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_preflight_id_hash_verified=true' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_duplicate_local_availability_check_performed=true' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_source_peer_reachable=true' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_final_peer_content_verify_green=true' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_recorded_now=true' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_execution_allowed_now=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_execute_packet_created_now=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_command_rendered_now=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_command_executed_now=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_mirror_executed_now=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_pin_executed_now=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_public_mutation=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_ledger_write=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_wc_credit_award=false' "$OUT/mirrored-operator-approval.log"
grep -Fq 'operator_approval_private_leak_scan_green=true' "$OUT/mirrored-operator-approval.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_DOC_V1' docs/public/public-node-datanet-core-peer-pin-operator-approval-packet-v1.md

echo "peer_pin_operator_approval_published_packet_green=true"
echo "peer_pin_operator_approval_mirrored_packet_green=true"
echo "operator_approval_public_mutation=false"
echo "operator_approval_ledger_write=false"
echo "operator_approval_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_PROOF_V1_GREEN"
