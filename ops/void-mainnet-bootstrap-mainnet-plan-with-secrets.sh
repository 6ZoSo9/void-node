#!/usr/bin/env bash
set -euo pipefail

echo "=== [mainnet-plan-with-secrets] VOID mainnet bootstrap PLAN + secrets check (no broadcast) ==="

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$REPO_ROOT"

echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] CONFIG    = $CONFIG_PATH"
echo "[cfg] RPC_URL   = $RPC_URL"

# Hard gate: we must have the deployer key in env.
if [ -z "${VOID_MAINNET_DEPLOYER_KEY:-}" ]; then
  echo
  echo "[FATAL] VOID_MAINNET_DEPLOYER_KEY is not set in the environment."
  echo "        plan-with-secrets requires this env so we can prove the"
  echo "        env key address == roles.deployer from LIVE JSON."
  exit 1
fi

echo
echo "[step] running forge script (planWithSecrets) in PLAN-only mode..."
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --sig 'planWithSecrets(string)' \
  "$CONFIG_PATH" \
  --rpc-url "$RPC_URL"

echo
echo "[result] planWithSecrets completed (no broadcasts, no state changes)."
echo "         - chainId sanity checked"
echo "         - roles invariants checked"
echo "         - validator0 stake > 0"
echo "         - VOID_MAINNET_DEPLOYER_KEY address == roles.deployer"
