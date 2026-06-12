#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-weighted-closeout.md"

echo "=== VOID Public Node Weighted Local Data Drop Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-weighted-source-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-weighted-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_CLOSEOUT_V1" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_SOURCE_V1_GREEN" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-weighted-source-green-20260611-235924" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-weighted-live-green-20260612-001906" "$DOC"
grep -Fq "persistent does not mean equal priority" "$DOC"
grep -Fq "void-node.service" "$DOC"
grep -Fq "public mutation: false" "$DOC"
grep -Fq "trusted as network truth: false" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-weighted-source-proof.sh
bash ops/mainnet0/public-node-local-data-drop-weighted-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_CLOSEOUT_V1_GREEN"
