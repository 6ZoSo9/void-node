#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-peer-pin-review-fixture-v1"
MIRROR_NODE_LABEL="peer-pin-review-proof-node"
OUT="${TMPDIR:-/tmp}/void-datanet-core-peer-pin-review-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID DataNet Core Peer Pin Review v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_REVIEW_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Peer Pin Review fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_PEER_PIN_REVIEW_FIXTURE_V1","ok":true,"purpose":"peer-pin-review"}\n' > "$SRC/nested/metadata.json"

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
REQUESTER_NODE_LABEL=pin-review-proof-requester \
TARGET_NODE_LABEL=pin-review-proof-target \
  ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/published-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/published-pin-request.log"

OUT_DIR="$OUT/mirrored-pin-request" \
PEER_BASE="$BASE" \
SELECT_MODE=mirrored \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
REQUESTER_NODE_LABEL=pin-review-proof-requester \
TARGET_NODE_LABEL=pin-review-proof-target \
  ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/mirrored-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/mirrored-pin-request.log"

PIN_REQUEST_FILE="$OUT/published-pin-request/pin-request.json" \
SOURCE_PEER_BASE="$BASE" \
REVIEWER_NODE_LABEL=pin-review-proof-reviewer \
OUT_DIR="$OUT/published-pin-review" \
  ops/mainnet0/datanet-core-peer-pin-review-v1.sh > "$OUT/published-pin-review.log"

cat "$OUT/published-pin-review.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_request_id_hash_verified=true' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_peer_content_verified_before_operator_approval=true' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_operator_review_required=true' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_operator_approved_now=false' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_mirror_executed_now=false' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_pin_executed_now=false' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_public_mutation=false' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_ledger_write=false' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_wc_credit_award=false' "$OUT/published-pin-review.log"
grep -Fq 'pin_review_private_leak_scan_green=true' "$OUT/published-pin-review.log"

PIN_REQUEST_FILE="$OUT/mirrored-pin-request/pin-request.json" \
SOURCE_PEER_BASE="$BASE" \
REVIEWER_NODE_LABEL=pin-review-proof-reviewer \
OUT_DIR="$OUT/mirrored-pin-review" \
  ops/mainnet0/datanet-core-peer-pin-review-v1.sh > "$OUT/mirrored-pin-review.log"

cat "$OUT/mirrored-pin-review.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_V1_GREEN' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_request_id_hash_verified=true' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_peer_content_verified_before_operator_approval=true' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_operator_review_required=true' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_operator_approved_now=false' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_mirror_executed_now=false' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_pin_executed_now=false' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_public_mutation=false' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_ledger_write=false' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_wc_credit_award=false' "$OUT/mirrored-pin-review.log"
grep -Fq 'pin_review_private_leak_scan_green=true' "$OUT/mirrored-pin-review.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REVIEW_DOC_V1' docs/public/public-node-datanet-core-peer-pin-review-v1.md

echo "peer_pin_review_published_packet_green=true"
echo "peer_pin_review_mirrored_packet_green=true"
echo "pin_review_public_mutation=false"
echo "pin_review_ledger_write=false"
echo "pin_review_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_REVIEW_PROOF_V1_GREEN"
