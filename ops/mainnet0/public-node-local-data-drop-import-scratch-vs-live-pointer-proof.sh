#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop.md"
RULE_DOC="docs/public/public-node-local-data-drop-import-scratch-vs-live.md"

echo "=== VOID Public Node Local Data Drop Import Scratch vs Live Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -f "$RULE_DOC"
test -x ops/mainnet0/public-node-local-data-drop-import-scratch-vs-live-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_DOC_V1" "$DOC"
grep -Fq "Scratch vs live import" "$DOC"
grep -Fq "Scratch import: set \`DATA_DIR\` to a temporary or alternate directory" "$DOC"
grep -Fq "Live import: use the node runtime data directory" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-import-scratch-vs-live.md" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_V1" "$RULE_DOC"

bash ops/mainnet0/public-node-local-data-drop-import-scratch-vs-live-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_V1_GREEN"
