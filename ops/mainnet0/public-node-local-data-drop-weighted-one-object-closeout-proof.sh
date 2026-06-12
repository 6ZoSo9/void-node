#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-weighted-one-object-closeout.md"

echo "=== VOID Public Node Weighted Local Data Drop One Object Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-weighted-closeout-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-weighted-one-object-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_ONE_OBJECT_CLOSEOUT_V1" "$DOC"
grep -Fq "void-weighted-seed-v1.txt" "$DOC"
grep -Fq "0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_ONE_OBJECT_V1_GREEN" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-weighted-one-object-green-20260612-003252" "$DOC"
grep -Fq "trust_score=0.9" "$DOC"
grep -Fq "source_weight=0.9" "$DOC"
grep -Fq "storage_tier=hot" "$DOC"
grep -Fq "ai_visibility=high" "$DOC"
grep -Fq "promotion_eligible=true" "$DOC"
grep -Fq "content-address fetch" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-weighted-closeout-proof.sh
bash ops/mainnet0/public-node-local-data-drop-weighted-one-object-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_ONE_OBJECT_CLOSEOUT_V1_GREEN"
