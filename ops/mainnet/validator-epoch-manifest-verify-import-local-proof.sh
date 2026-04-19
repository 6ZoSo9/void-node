#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

RPC_URL="${RPC_URL:-http://127.0.0.1:10035}"
CHAIN_ID_EXPECTED="${CHAIN_ID_EXPECTED:-31337}"
FORCE_REAL_CHAIN="${FORCE_REAL_CHAIN:-0}"
BASE_DIR="${BASE_DIR:-/tmp/validator-epoch-manifest-verify-import.$(date +%Y%m%d-%H%M%S)}"
EXPORT_DIR="$BASE_DIR/export"
IMPORT_DIR="$BASE_DIR/imported"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

echo "=== [1] rpc truth ==="
cast chain-id --rpc-url "$RPC_URL"
ACTUAL_CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
if [ "$ACTUAL_CHAIN_ID" != "$CHAIN_ID_EXPECTED" ]; then
  echo "[ERR] unexpected chain id: got=$ACTUAL_CHAIN_ID expected=$CHAIN_ID_EXPECTED"
  exit 1
fi

if [ "$ACTUAL_CHAIN_ID" = "2050" ] && [ "$FORCE_REAL_CHAIN" != "1" ]; then
  echo "[ERR] refusing to run validator-epoch-manifest-verify-import local proof on real chain 2050"
  echo "[ERR] use a disposable anvil, or set FORCE_REAL_CHAIN=1 if you intentionally want that risk"
  exit 1
fi

mkdir -p "$BASE_DIR" "$EXPORT_DIR" "$IMPORT_DIR"

echo
echo "=== [2] run manifest export proof ==="
RPC_URL="$RPC_URL" \
CHAIN_ID_EXPECTED="$CHAIN_ID_EXPECTED" \
PRIVATE_KEY="$PRIVATE_KEY" \
OUT_DIR="$EXPORT_DIR" \
bash ops/mainnet/validator-epoch-manifest-export-local-proof.sh

echo
echo "=== [3] verify + import exported manifests ==="
for f in "$EXPORT_DIR"/epoch-*.manifest.json; do
  VERIFY_RPC_URL="$RPC_URL" IMPORT_DIR="$IMPORT_DIR" python3 ops/mainnet/verify_import_validator_epoch_manifest_json.py "$f"
done

echo
echo "=== [4] imported artifact truth ==="
echo "base_dir=$BASE_DIR"
echo "--- export"
ls -1 "$EXPORT_DIR"
echo "--- imported"
ls -1 "$IMPORT_DIR"
