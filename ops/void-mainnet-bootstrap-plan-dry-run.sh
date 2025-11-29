#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [bootstrap-plan-dry-run] VOID mainnet bootstrap PLAN dry-run harness ==="

# RPC for PLAN simulation (must be chainId 2050 – e.g., local anvil-2050)
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CONFIG_PATH="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] RPC_URL     = $RPC_URL"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[FATAL] config file not found: $CONFIG_PATH" >&2
  exit 1
fi

echo "=== [0] quick JSON sanity (chainId + roles + contracts) ==="
if command -v jq >/dev/null 2>&1; then
  jq '{
    chainId,
    roles: {
      deployer: .roles.deployer,
      premineOwner: .roles.premineOwner,
      treasuryOwner: .roles.treasuryOwner,
      opsTreasuryOwner: .roles.opsTreasuryOwner,
      rewardEngineOwner: .roles.rewardEngineOwner,
      validatorSetOwner: .roles.validatorSetOwner
    },
    contracts: {
      updateGate: .contracts.updateGate,
      adminGate: .contracts.adminGate,
      configGate: .contracts.configGate,
      validatorSet: .contracts.validatorSet,
      voidToken: .contracts.voidToken,
      voidTreasury: .contracts.voidTreasury,
      opsTreasury: .contracts.opsTreasury,
      rewardEngine: .contracts.rewardEngine
    },
    validator0: {
      reward: .validator0.reward,
      consensusKey: .validator0.consensusKey
    }
  }' "$CONFIG_PATH" || echo "[WARN] jq parse failed; continuing..."
else
  echo "[WARN] jq not installed; skipping JSON preview."
fi
echo

echo "=== [1] forge script PLAN stub (expect REVERT from safety fuse) ==="
set +e
forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "$RPC_URL" \
  --sig "run(string)" \
  "$CONFIG_PATH"
RC=$?
set -e

echo
if [ "$RC" -ne 0 ]; then
  echo "[plan] forge script exited with rc=$RC (this is EXPECTED while the script has the stub revert)."
  echo "[plan] once we implement real wiring, rc=0 will be required for PLAN success."
else
  echo "[plan] forge script completed without revert (this will only happen after we remove the stub safety fuse)."
fi

echo
echo "=== [2] Bootstrap PLAN exporter + gauges ==="
if [ -x ./ops/void-mainnet-bootstrap-plan-health-all.sh ]; then
  ./ops/void-mainnet-bootstrap-plan-health-all.sh
else
  echo "[WARN] ./ops/void-mainnet-bootstrap-plan-health-all.sh not found or not executable; skipping exporter+gauges step."
fi

echo
echo "=== [done] PLAN dry-run harness finished (no broadcast, stub only) ==="
