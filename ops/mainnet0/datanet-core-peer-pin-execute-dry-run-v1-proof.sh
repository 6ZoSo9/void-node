#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-peer-pin-execute-dry-run-fixture-v1"
MIRROR_NODE_LABEL="peer-pin-execute-dry-run-proof-node"
OUT="${TMPDIR:-/tmp}/void-datanet-core-peer-pin-execute-dry-run-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID DataNet Core Peer Pin Execute Dry Run v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Peer Pin Execute Dry Run fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_FIXTURE_V1","ok":true,"purpose":"peer-pin-execute-dry-run"}\n' > "$SRC/nested/metadata.json"

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
REQUESTER_NODE_LABEL=pin-dry-run-proof-requester \
TARGET_NODE_LABEL=pin-dry-run-proof-target \
  ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/published-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/published-pin-request.log"

OUT_DIR="$OUT/mirrored-pin-request" \
PEER_BASE="$BASE" \
SELECT_MODE=mirrored \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
REQUESTER_NODE_LABEL=pin-dry-run-proof-requester \
TARGET_NODE_LABEL=pin-dry-run-proof-target \
  ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/mirrored-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/mirrored-pin-request.log"

PIN_REQUEST_FILE="$OUT/published-pin-request/pin-request.json" \
SOURCE_PEER_BASE="$BASE" \
REVIEWER_NODE_LABEL=pin-dry-run-proof-reviewer \
OUT_DIR="$OUT/published-pin-review" \
  ops/mainnet0/datanet-core-peer-pin-review-v1.sh > "$OUT/published-pin-review.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN' "$OUT/published-pin-review.log"

PIN_REQUEST_FILE="$OUT/mirrored-pin-request/pin-request.json" \
SOURCE_PEER_BASE="$BASE" \
REVIEWER_NODE_LABEL=pin-dry-run-proof-reviewer \
OUT_DIR="$OUT/mirrored-pin-review" \
  ops/mainnet0/datanet-core-peer-pin-review-v1.sh > "$OUT/mirrored-pin-review.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN' "$OUT/mirrored-pin-review.log"

PIN_REVIEW_FILE="$OUT/published-pin-review/pin-review.json" \
DRY_RUN_OPERATOR_LABEL=pin-dry-run-proof-operator \
OUT_DIR="$OUT/published-dry-run" \
  ops/mainnet0/datanet-core-peer-pin-execute-dry-run-v1.sh > "$OUT/published-dry-run.log"

cat "$OUT/published-dry-run.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1_GREEN' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_review_id_hash_verified=true' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_peer_content_verified_before_operator_approval=true' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_operator_approved_now=false' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_execution_allowed_now=false' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_mirror_executed_now=false' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_pin_executed_now=false' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_public_mutation=false' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_ledger_write=false' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_wc_credit_award=false' "$OUT/published-dry-run.log"
grep -Fq 'pin_execute_dry_run_private_leak_scan_green=true' "$OUT/published-dry-run.log"

PIN_REVIEW_FILE="$OUT/mirrored-pin-review/pin-review.json" \
DRY_RUN_OPERATOR_LABEL=pin-dry-run-proof-operator \
OUT_DIR="$OUT/mirrored-dry-run" \
  ops/mainnet0/datanet-core-peer-pin-execute-dry-run-v1.sh > "$OUT/mirrored-dry-run.log"

cat "$OUT/mirrored-dry-run.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_V1_GREEN' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_review_id_hash_verified=true' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_peer_content_verified_before_operator_approval=true' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_operator_approved_now=false' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_execution_allowed_now=false' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_mirror_executed_now=false' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_pin_executed_now=false' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_public_mutation=false' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_ledger_write=false' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_wc_credit_award=false' "$OUT/mirrored-dry-run.log"
grep -Fq 'pin_execute_dry_run_private_leak_scan_green=true' "$OUT/mirrored-dry-run.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_DOC_V1' docs/public/public-node-datanet-core-peer-pin-execute-dry-run-v1.md

echo "peer_pin_execute_dry_run_published_plan_green=true"
echo "peer_pin_execute_dry_run_mirrored_plan_green=true"
echo "pin_execute_dry_run_public_mutation=false"
echo "pin_execute_dry_run_ledger_write=false"
echo "pin_execute_dry_run_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_EXECUTE_DRY_RUN_PROOF_V1_GREEN"
