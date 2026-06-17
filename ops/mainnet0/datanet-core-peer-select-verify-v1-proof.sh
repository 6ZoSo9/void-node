#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-peer-select-verify-fixture-v1"
MIRROR_NODE_LABEL="peer-select-proof-node"
OUT="${TMPDIR:-/tmp}/void-datanet-core-peer-select-verify-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID DataNet Core Peer Select Verify v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_SELECT_VERIFY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Peer Select Verify fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_PEER_SELECT_VERIFY_FIXTURE_V1","ok":true,"purpose":"peer-select-verify"}\n' > "$SRC/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" > "$OUT/publish.log"

grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN' "$OUT/publish.log"

BASE="$BASE" \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  ops/mainnet0/datanet-core-mirror-loop-v1.sh > "$OUT/mirror-loop.log"

grep -Fq 'VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN' "$OUT/mirror-loop.log"

OUT_DIR="$OUT/published-select" \
PEER_BASE="$BASE" \
SELECT_MODE=published \
DATASET_ID="$DATASET_ID" \
  ops/mainnet0/datanet-core-peer-select-verify-v1.sh > "$OUT/published-select.log"

cat "$OUT/published-select.log"

grep -Fq 'VOID_DATANET_CORE_PEER_SELECT_VERIFY_V1_GREEN' "$OUT/published-select.log"
grep -Fq 'selected_type=operator_published' "$OUT/published-select.log"
grep -Fq 'selected_object_sha256_verified=true' "$OUT/published-select.log"
grep -Fq 'selected_object_bytes_verified=true' "$OUT/published-select.log"
grep -Fq 'peer_select_verify_private_leak_scan_green=true' "$OUT/published-select.log"
grep -Fq 'peer_select_verify_public_mutation=false' "$OUT/published-select.log"
grep -Fq 'peer_select_verify_ledger_write=false' "$OUT/published-select.log"
grep -Fq 'peer_select_verify_wc_credit_award=false' "$OUT/published-select.log"

OUT_DIR="$OUT/mirrored-select" \
PEER_BASE="$BASE" \
SELECT_MODE=mirrored \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  ops/mainnet0/datanet-core-peer-select-verify-v1.sh > "$OUT/mirrored-select.log"

cat "$OUT/mirrored-select.log"

grep -Fq 'VOID_DATANET_CORE_PEER_SELECT_VERIFY_V1_GREEN' "$OUT/mirrored-select.log"
grep -Fq 'selected_type=mirrored' "$OUT/mirrored-select.log"
grep -Fq "selected_mirror_node_label=$MIRROR_NODE_LABEL" "$OUT/mirrored-select.log"
grep -Fq 'selected_object_sha256_verified=true' "$OUT/mirrored-select.log"
grep -Fq 'selected_object_bytes_verified=true' "$OUT/mirrored-select.log"
grep -Fq 'peer_select_verify_private_leak_scan_green=true' "$OUT/mirrored-select.log"
grep -Fq 'peer_select_verify_public_mutation=false' "$OUT/mirrored-select.log"
grep -Fq 'peer_select_verify_ledger_write=false' "$OUT/mirrored-select.log"
grep -Fq 'peer_select_verify_wc_credit_award=false' "$OUT/mirrored-select.log"

grep -Fq 'VOID_DATANET_CORE_PEER_SELECT_VERIFY_DOC_V1' docs/public/public-node-datanet-core-peer-select-verify-v1.md

echo "peer_select_verify_published_path_green=true"
echo "peer_select_verify_mirrored_path_green=true"
echo "VOID_DATANET_CORE_PEER_SELECT_VERIFY_PROOF_V1_GREEN"
