#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-dir-multi-scratch-closeout.md"

echo "=== VOID Public Node Local Data Drop Import Dir Multi Scratch Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-import-dir-multi-scratch-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_MULTI_SCRATCH_CLOSEOUT_V1" "$DOC"
grep -Fq "alpha.txt" "$DOC"
grep -Fq "beta.txt" "$DOC"
grep -Fq "subdir/gamma.txt" "$DOC"
grep -Fq "subdir__gamma.txt" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1" "$DOC"
grep -Fq "imported count \`3\`" "$DOC"
grep -Fq "live weighted object count remains \`1\`" "$DOC"
grep -Fq "009c7cce" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-import-dir-multi-scratch-green-20260612-141244" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_MULTI_SCRATCH_V1_GREEN" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-import-dir-multi-scratch-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_MULTI_SCRATCH_CLOSEOUT_V1_GREEN"
