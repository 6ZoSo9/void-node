#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE_DIR="${BASE_DIR:-/tmp/validator-epoch-manifest-node-ingest-proof.$(date +%Y%m%d-%H%M%S)}"

echo "=== [1] run verified manifest import proof ==="
BASE_DIR="$BASE_DIR" bash ops/mainnet/validator-epoch-manifest-verify-import-proof-anvil.sh

echo
echo "=== [2] run node runtime ingest proof ==="
node ops/mainnet/validator_epoch_manifest_node_ingest_proof.cjs "$BASE_DIR/imported"

echo
echo "=== [3] node ingest summary preview ==="
sed -n '1,120p' "$BASE_DIR/imported/node_ingest_summary.json"

echo
echo "[ok] validator epoch manifest node ingest proof completed"
echo "base_dir=$BASE_DIR"
