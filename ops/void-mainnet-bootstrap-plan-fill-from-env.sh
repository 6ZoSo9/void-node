#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CONFIG="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"
TMP="${CONFIG}.tmp"

echo "=== [plan-fill-env] VOID mainnet PLAN fill-from-env ==="
echo "[cfg] CONFIG=${CONFIG}"

if [ ! -f "${CONFIG}" ]; then
  echo "[FATAL] CONFIG does not exist: ${CONFIG}" >&2
  exit 1
fi

echo
echo "=== [plan-fill-env] before (roles/contracts/validator0) ==="
jq '{roles,contracts,validator0}' "${CONFIG}" || {
  echo "[FATAL] jq could not parse CONFIG (before view)" >&2
  exit 1
}

echo
echo "=== [plan-fill-env] applying env overrides (if set) ==="
jq '
  .roles.deployer          |= (env.VOID_MAINNET_PLAN_DEPLOYER           // .) |
  .roles.treasuryAdmin     |= (env.VOID_MAINNET_PLAN_TREASURY_ADMIN     // .) |
  .roles.opsTreasuryAdmin  |= (env.VOID_MAINNET_PLAN_OPS_TREASURY_ADMIN // .) |
  .roles.validatorAdmin    |= (env.VOID_MAINNET_PLAN_VALIDATOR_ADMIN    // .) |
  .roles.adminGateOwner    |= (env.VOID_MAINNET_PLAN_ADMIN_GATE_OWNER   // .) |
  .roles.updateGateOwner   |= (env.VOID_MAINNET_PLAN_UPDATE_GATE_OWNER  // .) |
  .roles.configGateOwner   |= (env.VOID_MAINNET_PLAN_CONFIG_GATE_OWNER  // .) |
  .roles.treasuryOwner     |= (env.VOID_MAINNET_PLAN_TREASURY_OWNER     // .) |
  .roles.opsTreasuryOwner  |= (env.VOID_MAINNET_PLAN_OPS_TREASURY_OWNER // .) |
  .roles.rewardEngineOwner |= (env.VOID_MAINNET_PLAN_REWARD_OWNER       // .) |
  .roles.validatorSetOwner |= (env.VOID_MAINNET_PLAN_VALIDATORSET_OWNER // .) |

  .contracts.updateGate    |= (env.VOID_MAINNET_PLAN_UPDATE_GATE_ADDR   // .) |
  .contracts.adminGate     |= (env.VOID_MAINNET_PLAN_ADMIN_GATE_ADDR    // .) |
  .contracts.configGate    |= (env.VOID_MAINNET_PLAN_CONFIG_GATE_ADDR   // .) |
  .contracts.validatorSet  |= (env.VOID_MAINNET_PLAN_VALIDATORSET_ADDR  // .) |
  .contracts.voidToken     |= (env.VOID_MAINNET_PLAN_VOID_TOKEN_ADDR    // .) |
  .contracts.premineVault  |= (env.VOID_MAINNET_PLAN_PREMINE_VAULT_ADDR // .) |
  .contracts.treasury      |= (env.VOID_MAINNET_PLAN_TREASURY_ADDR      // .) |
  .contracts.voidTreasury  |= (env.VOID_MAINNET_PLAN_VOID_TREASURY_ADDR // .) |
  .contracts.opsTreasury   |= (env.VOID_MAINNET_PLAN_OPS_TREASURY_ADDR  // .) |
  .contracts.rewardEngine  |= (env.VOID_MAINNET_PLAN_REWARD_ENGINE_ADDR // .) |

  .validator0.reward       |= (env.VOID_MAINNET_PLAN_VALIDATOR0_REWARD_ADDR // .) |
  .validator0.consensusKey |= (env.VOID_MAINNET_PLAN_VALIDATOR0_CONS_KEY    // .) |
  .validator0.stakeVOID    |= (env.VOID_MAINNET_PLAN_VALIDATOR0_STAKE_VOID  // .)
' "${CONFIG}" > "${TMP}"

mv "${TMP}" "${CONFIG}"

echo
echo "=== [plan-fill-env] after (roles/contracts/validator0) ==="
jq '{roles,contracts,validator0}' "${CONFIG}" || {
  echo "[FATAL] jq could not parse CONFIG (after view)" >&2
  exit 1
}

echo
echo "=== [plan-fill-env] DONE ==="
