#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-dir-scratch-closeout.md"

echo "=== VOID Public Node Local Data Drop Import Dir Scratch Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-import-dir-scratch-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_SCRATCH_CLOSEOUT_V1" "$DOC"
grep -Fq "void-import-scratch-v1.txt" "$DOC"
grep -Fq "b851165cc2ba6722881d245892a39186eb42c3c84d54fa86300d424a094f6e35" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1" "$DOC"
grep -Fq "live weighted object count remains \`1\`" "$DOC"
grep -Fq "cd9dbdbd" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-import-dir-scratch-green-20260612-140648" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_SCRATCH_V1_GREEN" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-import-dir-scratch-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_SCRATCH_CLOSEOUT_V1_GREEN"
