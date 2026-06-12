#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-folder-intake-proof-$STAMP}"
DATA_DIR="$OUT/data"

echo "=== VOID Public Node Demo 003 Folder Intake Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "out=$OUT"

mkdir -p "$OUT"

before="$(git status --short --untracked-files=no)"

DATA_DIR="$DATA_DIR" OUT="$OUT/intake-run" \
  ops/mainnet0/public-node-local-data-drop-demo003-folder-intake.sh | tee "$OUT/intake.log"

DATA_DIR="$DATA_DIR" \
  ops/mainnet0/public-node-local-data-drop-demo003-folder-intake-status.sh | tee "$OUT/status.log"

after="$(git status --short --untracked-files=no)"
if [ "$before" != "$after" ]; then
  echo "no_source_mutation=false"
  git status --short
  exit 1
fi

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED" "$OUT/intake.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true" "$OUT/status.log"
grep -q "offline_verified=true" "$OUT/status.log"
grep -q "network_fetch_during_import=false" "$OUT/status.log"
grep -q "trusted_as_network_truth=false" "$OUT/status.log"

echo "no_source_mutation=true"
echo "demo003_folder_intake_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_PROOF_V1_GREEN"
