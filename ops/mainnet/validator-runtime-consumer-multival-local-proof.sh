#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

RPC_URL="${RPC_URL:-http://127.0.0.1:9945}"
CHAIN_ID_EXPECTED="${CHAIN_ID_EXPECTED:-31337}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
FORCE_REAL_CHAIN="${FORCE_REAL_CHAIN:-0}"

BAD="script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol"
PARK_DIR="script/mainnet_rebuild_disabled"
STAMP="$(date +%Y%m%d-%H%M%S)"
PARK="$PARK_DIR/$(basename "$BAD").park.run.$STAMP"

restore_bad() {
  if [ -f "$PARK" ]; then
    mkdir -p "$(dirname "$BAD")"
    mv -f "$PARK" "$BAD"
  fi
}

trap restore_bad EXIT

echo "=== [1] rpc truth ==="
cast chain-id --rpc-url "$RPC_URL"
ACTUAL_CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
if [ "$ACTUAL_CHAIN_ID" != "$CHAIN_ID_EXPECTED" ]; then
  echo "[ERR] unexpected chain id: got=$ACTUAL_CHAIN_ID expected=$CHAIN_ID_EXPECTED"
  exit 1
fi

if [ "$ACTUAL_CHAIN_ID" = "2050" ] && [ "$FORCE_REAL_CHAIN" != "1" ]; then
  echo "[ERR] refusing to run validator-runtime-consumer multival local proof on real chain 2050"
  echo "[ERR] use a disposable anvil, or set FORCE_REAL_CHAIN=1 if you intentionally want that risk"
  exit 1
fi

echo
echo "=== [2] park known broken rebuild script for forge ==="
test -f "$BAD"
mkdir -p "$PARK_DIR"
mv -f "$BAD" "$PARK"
echo "parked=$PARK"

echo
echo "=== [3] run runtime consumer multival local proof script ==="
export PRIVATE_KEY
forge script script/mainnet_upgrade/ValidatorRuntimeConsumerMultiValidatorLocalProof.s.sol:ValidatorRuntimeConsumerMultiValidatorLocalProof \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast

echo
echo "=== [4] restore parked rebuild script ==="
restore_bad
trap - EXIT
