#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE_DIR="${BASE_DIR:-/tmp/validator-epoch-runtime-adapter-proof.$(date +%Y%m%d-%H%M%S)}"

echo "=== [1] run node ingest proof ==="
BASE_DIR="$BASE_DIR" bash ops/mainnet/validator-epoch-manifest-node-ingest-proof-anvil.sh

echo
echo "=== [2] run runtime adapter proof ==="
node ops/mainnet/validator_epoch_runtime_adapter_proof.cjs "$BASE_DIR/imported"

echo
echo "=== [3] runtime adapter summary preview ==="
sed -n '1,160p' "$BASE_DIR/imported/runtime_adapter_summary.json"

echo
echo "[ok] validator epoch runtime adapter proof completed"
echo "base_dir=$BASE_DIR"
