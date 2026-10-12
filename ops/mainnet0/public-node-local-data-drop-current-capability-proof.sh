#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-current-capability.md"
VERIFY="ops/mainnet0/public-node-local-data-drop-object-endpoints-proof.sh"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"

echo "=== VOID Public Node Local Data Drop Current Capability Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"
echo "no_nested_proofs=true"

test -f "$DOC"
test -x "$VERIFY"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_V1" "$DOC"
grep -Fq "detect the live public route DATA_DIR" "$DOC"
grep -Fq "generate a no-mutation import target plan" "$DOC"
grep -Fq "import local files into the live route DATA_DIR" "$DOC"
grep -Fq "expose imported files as weighted records" "$DOC"
grep -Fq "serve an imported object by object id" "$DOC"
grep -Fq "serve the same bytes by sha256 content address" "$DOC"
grep -Fq "serve proof JSON for the imported object" "$DOC"
grep -Fq "verify object route, content-address route, and proof route" "$DOC"

grep -Fq "live-import-demo-002.txt" "$DOC"
grep -Fq "$SHA" "$DOC"
grep -Fq "/home/zoso/dev/void-node/data_a" "$DOC"
grep -Fq "weighted route object count after Demo 002: \`3\`" "$DOC"
grep -Fq "operator-local import, not open public upload" "$DOC"
grep -Fq "Public routes are read-only" "$DOC"

bash "$VERIFY" live-import-demo-002.txt "$SHA" >/tmp/void-current-capability-object-endpoints-proof.out
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_ENDPOINTS_PROOF_V1_GREEN" /tmp/void-current-capability-object-endpoints-proof.out

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_V1_GREEN"
