#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-safe-live-import-flow.md"
VERIFY="ops/mainnet0/public-node-local-data-drop-object-endpoints-proof.sh"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"

echo "=== VOID Public Node Local Data Drop Object Endpoints Proof Pointer v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -x "$VERIFY"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_POINTER_V1" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-object-endpoints-proof.sh OBJECT_ID SHA256" "$DOC"
grep -Fq "live-import-demo-002.txt $SHA" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_V1_GREEN" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_V1" "$VERIFY"
grep -Fq "object_endpoint_json_verified=true" "$VERIFY"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_POINTER_V1_GREEN"
