#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE_DIR="${BASE_DIR:-/tmp/validator-runtime-truth-switch-proof.$(date +%Y%m%d-%H%M%S)}"

echo "=== [1] run runtime adapter proof ==="
BASE_DIR="$BASE_DIR" bash ops/mainnet/validator-epoch-runtime-adapter-proof-anvil.sh

echo
echo "=== [2] run runtime truth switch proof ==="
node ops/mainnet/validator_runtime_truth_switch_proof.cjs "$BASE_DIR/imported"

echo
echo "=== [3] runtime truth switch summary preview ==="
sed -n '1,180p' "$BASE_DIR/imported/runtime_truth_switch_summary.json"

echo
echo "[ok] validator runtime truth switch proof completed"
echo "base_dir=$BASE_DIR"
