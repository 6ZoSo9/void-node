#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-weighted-status-card-closeout.md"

echo "=== VOID Public Node Weighted Local Data Drop Status Card Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-weighted-status-card-source-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-weighted-status-card-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-weighted-one-object-closeout-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_CLOSEOUT_V1" "$DOC"
grep -Fq "publicNodeLocalDataDropWeightedCard" "$DOC"
grep -Fq "publicNodeLocalDataDropWeightedStatus" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_UI_V1" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "weighted_records_len=1" "$DOC"
grep -Fq "void-weighted-seed-v1.txt" "$DOC"
grep -Fq "0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-weighted-status-card-source-green-20260612-004024" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-weighted-status-card-live-green-20260612-004627" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_SOURCE_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_V1_GREEN" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-weighted-one-object-closeout-proof.sh
bash ops/mainnet0/public-node-local-data-drop-weighted-status-card-source-proof.sh
bash ops/mainnet0/public-node-local-data-drop-weighted-status-card-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_CLOSEOUT_V1_GREEN"
