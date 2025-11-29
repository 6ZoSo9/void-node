#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [mainnet-bootstrap-plan-sim] VOID mainnet PLAN simulation (stub) ==="
echo "[info] REPO_ROOT   = $(pwd)"
echo "[info] RPC_URL     = $RPC_URL"
echo "[info] CONFIG_PATH = $CONFIG_PATH"
echo
echo "[step] running forge script (expect stub revert)..."
echo

set +e
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig 'run(string)' \
  "$CONFIG_PATH" \
  -vvvv
EXIT_CODE=$?
set -e

echo
echo "[plan-sim] forge exit code = $EXIT_CODE"
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "[plan-sim] WARN: script did not revert; check stub fuse."
else
  echo "[plan-sim] NOTE: non-zero exit is expected while stub fuse is in place."
fi

echo
echo "=== [mainnet-bootstrap-plan-sim] DONE ==="
