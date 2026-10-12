#!/usr/bin/env bash
set -euo pipefail

LOCAL_DOC="docs/public/public-node-local-data-drop.md"
STATUS_DOC="docs/public/mainnet0-current-public-status.md"

LOCAL_MARKER="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_RUNTIME_QUARANTINE_POINTER_DOC_V1"
STATUS_MARKER="VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_STATUS_POINTER_V1"
PROOF_MARKER="VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_PROOF_V1_GREEN"
CHECKPOINT="08383516"
TAG="ckpt-public-node-live-runtime-quarantine-green-20260612-210820"

echo "=== VOID Public Node Live Runtime Quarantine Status Pointer Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_STATUS_POINTER_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "no_source_mutation=true"

test -f "$LOCAL_DOC"
test -f "$STATUS_DOC"
test -x ops/mainnet0/public-node-live-runtime-quarantine-install.sh
test -x ops/mainnet0/public-node-live-runtime-quarantine-proof.sh

grep -q "$LOCAL_MARKER" "$LOCAL_DOC"
grep -q "$STATUS_MARKER" "$STATUS_DOC"

grep -q "$CHECKPOINT" "$LOCAL_DOC"
grep -q "$CHECKPOINT" "$STATUS_DOC"

grep -q "$TAG" "$LOCAL_DOC"
grep -q "$TAG" "$STATUS_DOC"

grep -q "$PROOF_MARKER" "$LOCAL_DOC"
grep -q "$PROOF_MARKER" "$STATUS_DOC"

grep -q 'ops/mainnet0/public-node-live-runtime-quarantine-install.sh' "$LOCAL_DOC"
grep -q 'ops/mainnet0/public-node-live-runtime-quarantine-proof.sh' "$LOCAL_DOC"

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "local_doc_pointer_verified=true"
echo "status_doc_pointer_verified=true"
echo "VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_STATUS_POINTER_PROOF_V1_GREEN"
