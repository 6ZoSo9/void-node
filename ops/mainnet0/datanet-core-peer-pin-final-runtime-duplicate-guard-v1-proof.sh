#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-peer-pin-final-runtime-duplicate-guard-fixture-v1"
MIRROR_NODE_LABEL="peer-pin-final-runtime-duplicate-guard-proof-node"
OUT="${TMPDIR:-/tmp}/void-datanet-core-peer-pin-final-runtime-duplicate-guard-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID DataNet Core Peer Pin Final Runtime Duplicate Guard v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Peer Pin Final Runtime Duplicate Guard fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_FIXTURE_V1","ok":true,"purpose":"peer-pin-final-runtime-duplicate-guard"}\n' > "$SRC/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" > "$OUT/publish.log"

grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN' "$OUT/publish.log"

BASE="$BASE" \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  ops/mainnet0/datanet-core-mirror-loop-v1.sh > "$OUT/mirror-loop.log"

grep -Fq 'VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN' "$OUT/mirror-loop.log"

make_exact_command() {
  local mode="$1"
  local label="$2"

  OUT_DIR="$OUT/${label}-pin-request" \
  PEER_BASE="$BASE" \
  SELECT_MODE="$mode" \
  DATASET_ID="$DATASET_ID" \
  MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  REQUESTER_NODE_LABEL=pin-runtime-duplicate-guard-proof-requester \
  TARGET_NODE_LABEL=pin-runtime-duplicate-guard-proof-target \
    ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/${label}-pin-request.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/${label}-pin-request.log"

  PIN_REQUEST_FILE="$OUT/${label}-pin-request/pin-request.json" \
  SOURCE_PEER_BASE="$BASE" \
  REVIEWER_NODE_LABEL=pin-runtime-duplicate-guard-proof-reviewer \
  OUT_DIR="$OUT/${label}-pin-review" \
    ops/mainnet0/datanet-core-peer-pin-review-v1.sh > "$OUT/${label}-pin-review.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN' "$OUT/${label}-pin-review.log"

  PIN_REVIEW_FILE="$OUT/${label}-pin-review/pin-review.json" \
  DRY_RUN_OPERATOR_LABEL=pin-runtime-duplicate-guard-proof-operator \
  OUT_DIR="$OUT/${label}-dry-run" \
    ops/mainnet0/datanet-core-peer-pin-execute-dry-run-v1.sh > "$OUT/${label}-dry-run.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1_GREEN' "$OUT/${label}-dry-run.log"

  PIN_DRY_RUN_PLAN_FILE="$OUT/${label}-dry-run/dry-run-plan.json" \
  SOURCE_PEER_BASE="$BASE" \
  LOCAL_BASE="$BASE" \
  PREFLIGHT_OPERATOR_LABEL=pin-runtime-duplicate-guard-proof-operator \
  OUT_DIR="$OUT/${label}-final-preflight" \
    ops/mainnet0/datanet-core-peer-pin-final-preflight-v1.sh > "$OUT/${label}-final-preflight.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_PREFLIGHT_V1_GREEN' "$OUT/${label}-final-preflight.log"

  FINAL_PREFLIGHT_FILE="$OUT/${label}-final-preflight/final-preflight.json" \
  OPERATOR_APPROVAL_LABEL=pin-runtime-duplicate-guard-proof-operator \
  OUT_DIR="$OUT/${label}-operator-approval" \
    ops/mainnet0/datanet-core-peer-pin-operator-approval-packet-v1.sh > "$OUT/${label}-operator-approval.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_OPERATOR_APPROVAL_PACKET_V1_GREEN' "$OUT/${label}-operator-approval.log"

  OPERATOR_APPROVAL_FILE="$OUT/${label}-operator-approval/operator-approval.json" \
  SOURCE_PEER_BASE="$BASE" \
  EXECUTE_OPERATOR_LABEL=pin-runtime-duplicate-guard-proof-operator \
  OUT_DIR="$OUT/${label}-exact-command" \
    ops/mainnet0/datanet-core-peer-pin-exact-execute-command-packet-v1.sh > "$OUT/${label}-exact-command.log"

  grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXACT_EXECUTE_COMMAND_PACKET_V1_GREEN' "$OUT/${label}-exact-command.log"
}

make_exact_command published published
make_exact_command mirrored mirrored

EXACT_COMMAND_PACKET_FILE="$OUT/published-exact-command/exact-execute-command-packet.json" \
LOCAL_BASE="$BASE" \
RUNTIME_GUARD_OPERATOR_LABEL=pin-runtime-duplicate-guard-proof-operator \
OUT_DIR="$OUT/published-runtime-duplicate-guard" \
  ops/mainnet0/datanet-core-peer-pin-final-runtime-duplicate-guard-v1.sh > "$OUT/published-runtime-duplicate-guard.log"

cat "$OUT/published-runtime-duplicate-guard.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_V1_GREEN' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_command_packet_id_hash_verified=true' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_performed_now=true' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_duplicate_found=true' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_current_executor_supports_selected_type=true' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_command_rendered_now=true' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_command_executed_now=false' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_execution_allowed_now=false' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_mirror_executed_now=false' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_pin_executed_now=false' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_public_mutation=false' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_ledger_write=false' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_wc_credit_award=false' "$OUT/published-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_private_leak_scan_green=true' "$OUT/published-runtime-duplicate-guard.log"

EXACT_COMMAND_PACKET_FILE="$OUT/mirrored-exact-command/exact-execute-command-packet.json" \
LOCAL_BASE="$BASE" \
RUNTIME_GUARD_OPERATOR_LABEL=pin-runtime-duplicate-guard-proof-operator \
OUT_DIR="$OUT/mirrored-runtime-duplicate-guard" \
  ops/mainnet0/datanet-core-peer-pin-final-runtime-duplicate-guard-v1.sh > "$OUT/mirrored-runtime-duplicate-guard.log"

cat "$OUT/mirrored-runtime-duplicate-guard.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_V1_GREEN' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_command_packet_id_hash_verified=true' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_performed_now=true' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_duplicate_found=true' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_current_executor_supports_selected_type=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_mirrored_source_executor_required=true' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_command_rendered_now=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_command_executed_now=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_execution_allowed_now=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_mirror_executed_now=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_pin_executed_now=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_public_mutation=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_ledger_write=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_wc_credit_award=false' "$OUT/mirrored-runtime-duplicate-guard.log"
grep -Fq 'runtime_duplicate_guard_private_leak_scan_green=true' "$OUT/mirrored-runtime-duplicate-guard.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_DOC_V1' docs/public/public-node-datanet-core-peer-pin-final-runtime-duplicate-guard-v1.md

echo "peer_pin_final_runtime_duplicate_guard_published_packet_green=true"
echo "peer_pin_final_runtime_duplicate_guard_mirrored_executor_gap_green=true"
echo "runtime_duplicate_guard_public_mutation=false"
echo "runtime_duplicate_guard_ledger_write=false"
echo "runtime_duplicate_guard_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_FINAL_RUNTIME_DUPLICATE_GUARD_PROOF_V1_GREEN"
