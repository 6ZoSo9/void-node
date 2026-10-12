#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-scratch-vs-live-pointer-closeout.md"

echo "=== VOID Public Node Local Data Drop Import Scratch vs Live Pointer Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-import-scratch-vs-live-pointer-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_CLOSEOUT_V1" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop.md" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_DOC_V1" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-import-scratch-vs-live.md" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_V1" "$DOC"
grep -Fq "735ed8ef" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-import-scratch-vs-live-pointer-green-20260612-142133" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_V1_GREEN" "$DOC"
grep -Fq "object_count=1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware deferred" "$DOC"
grep -Fq "cross-box pending" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-import-scratch-vs-live-pointer-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_CLOSEOUT_V1_GREEN"
