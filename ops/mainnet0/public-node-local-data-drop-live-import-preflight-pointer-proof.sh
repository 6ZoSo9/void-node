#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-live-import-runbook.md"
CLOSEOUT="docs/public/public-node-local-data-drop-live-import-preflight-closeout.md"

echo "=== VOID Public Node Local Data Drop Live Import Preflight Pointer Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -f "$CLOSEOUT"
test -x ops/mainnet0/public-node-local-data-drop-live-import-preflight-closeout-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_DOC_V1" "$DOC"
grep -Fq "Before running a live import, run the preflight tool first" "$DOC"
grep -Fq "predicts the expected post-import object count" "$DOC"
grep -Fq "It does not run the import" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-live-import-preflight.sh /path/to/source-dir" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_V1_READY" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-live-import-preflight-closeout.md" "$DOC"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_CLOSEOUT_V1" "$CLOSEOUT"
grep -Fq "mutation_performed=false" "$CLOSEOUT"

VOID_LIVE_IMPORT_PREFLIGHT_ALLOW_DIRTY=true \
  bash ops/mainnet0/public-node-local-data-drop-live-import-preflight-closeout-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_PREFLIGHT_POINTER_V1_GREEN"
