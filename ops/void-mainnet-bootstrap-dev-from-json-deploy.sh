#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

CFG="${1:-config/void-mainnet-bootstrap-dev.json}"

RPC="${RPC_URL:-${ANVIL_RPC:-http://127.0.0.1:8545}}"
KEY="${DEV_DEPLOYER_KEY:-${ANVIL_KEY_0:-}}"

echo "=== VOID mainnet bootstrap DEV (FromJson deploy) ==="
echo "[deploy] config path: $CFG"
echo "[deploy] rpc        : $RPC"

if [ -z "${KEY:-}" ]; then
  echo "[deploy] ERROR: DEV_DEPLOYER_KEY or ANVIL_KEY_0 must be set with the deployer private key." >&2
  echo "         Example (anvil default):" >&2
  echo "           export ANVIL_KEY_0=0xac0974be... (first anvil account)" >&2
  exit 1
fi

export VOID_MAINNET_CONFIG="$CFG"

forge script script/VoidMainnetBootstrapDevFromJsonDeploy.s.sol:VoidMainnetBootstrapDevFromJsonDeploy \
  --rpc-url "$RPC" \
  --private-key "$KEY" \
  --broadcast \
  -vvvv

echo "=== DONE: DEV FromJson deploy complete ==="
