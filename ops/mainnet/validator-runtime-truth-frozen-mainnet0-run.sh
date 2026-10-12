#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

DEPLOYED_JSON="${DEPLOYED_JSON:-$HOME/dev/void-node/ops/mainnet/void-mainnet.deployed.json}"
EPOCHS="${EPOCHS:-1}"
START_SLOT="${START_SLOT:-0}"
END_SLOT_EXCLUSIVE="${END_SLOT_EXCLUSIVE:-8}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BASE_DIR="${BASE_DIR:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/frozen-mainnet0-$STAMP}"
EXPORT_DIR="$BASE_DIR/export"

mkdir -p "$EXPORT_DIR"

echo "=== [1] export frozen-mainnet0 hybrid manifests ==="
for EPOCH in $(printf '%s' "$EPOCHS" | tr ',' ' '); do
  OUT_JSON="$EXPORT_DIR/epoch-$(printf '%06d' "$EPOCH").manifest.verified.json"
  DEPLOYED_JSON="$DEPLOYED_JSON" \
  EPOCH="$EPOCH" \
  START_SLOT="$START_SLOT" \
  END_SLOT_EXCLUSIVE="$END_SLOT_EXCLUSIVE" \
  OUT_JSON="$OUT_JSON" \
  "$HOME/dev/void-node/ops/mainnet/export_validator_epoch_manifest_json_frozen_mainnet0.py"
done

echo
echo "=== [2] publish manifests ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-publish-dir.sh" "$EXPORT_DIR"

echo
echo "=== [3] live proof ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-live-proof.sh" \
  "$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current"

echo
echo "=== [4] shadow runner ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-shadow-run.sh" \
  "$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current"

echo
echo "=== [5] done ==="
echo "base_dir=$BASE_DIR"
echo "export_dir=$EXPORT_DIR"
