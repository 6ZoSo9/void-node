#!/usr/bin/env bash
set -euo pipefail

MAIN="docs/public/public-node-local-data-drop.md"
CAP="docs/public/public-node-local-data-drop-current-capability.md"

echo "=== VOID Public Node Local Data Drop Current Capability Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"
echo "no_nested_proofs=true"

test -f "$MAIN"
test -f "$CAP"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_POINTER_V1" "$MAIN"
grep -Fq "docs/public/public-node-local-data-drop-current-capability.md" "$MAIN"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_V1" "$MAIN"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_FINAL_GREEN" "$MAIN"
grep -Fq "serve them by object id" "$MAIN"
grep -Fq "sha256 content address" "$MAIN"
grep -Fq "serve proof JSON" "$MAIN"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_V1" "$CAP"
grep -Fq "live-import-demo-002.txt" "$CAP"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_V1_GREEN" "$CAP"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_POINTER_V1_GREEN"
