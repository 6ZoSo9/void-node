#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONFIG="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"
TEMPLATE="config/void-mainnet-bootstrap-mainnet.template.json"

echo "=== [VOID mainnet bootstrap PLAN] ==="
echo "[plan] repo:    $ROOT"
echo "[plan] config:  $CONFIG"

if [ ! -f "$CONFIG" ]; then
  echo "[warn] config file $CONFIG not found."
  if [ -f "$TEMPLATE" ]; then
    echo "[warn] falling back to TEMPLATE $TEMPLATE for address preview only"
    CONFIG="$TEMPLATE"
  else
    echo "[fatal] neither live config nor template exist; abort." >&2
    exit 1
  fi
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[fatal] jq is required for this planning script" >&2
  exit 1
fi

get() {
  jq -r "$1 // \"\"" "$CONFIG"
}

CHAIN_ID=$(get '.chainId')

DEPLOYER=$(get '.roles.deployer')
TREASURY_ADMIN=$(get '.roles.treasuryAdmin')
OPS_ADMIN=$(get '.roles.opsTreasuryAdmin')
VALIDATOR_ADMIN=$(get '.roles.validatorAdmin')

ADMIN_GATE_OWNER=$(get '.roles.adminGateOwner')
UPDATE_GATE_OWNER=$(get '.roles.updateGateOwner')
CONFIG_GATE_OWNER=$(get '.roles.configGateOwner')

TREASURY_OWNER=$(get '.roles.treasuryOwner')
OPS_OWNER=$(get '.roles.opsTreasuryOwner')
REWARD_OWNER=$(get '.roles.rewardEngineOwner')
VALSET_OWNER=$(get '.roles.validatorSetOwner')

VAL0_REWARD=$(get '.validator0.reward')
VAL0_STAKE=$(get '.validator0.stakeVOID')
VAL0_CONSKEY=$(get '.validator0.consensusKey')

echo
echo "[plan] chainId (config) = ${CHAIN_ID}"

echo
echo "[plan] core roles (EOAs / hardware wallets):"
echo "  deployer            = ${DEPLOYER}"
echo "  treasuryAdmin       = ${TREASURY_ADMIN}"
echo "  opsTreasuryAdmin    = ${OPS_ADMIN}"
echo "  validatorAdmin      = ${VALIDATOR_ADMIN}"
echo
echo "  adminGateOwner      = ${ADMIN_GATE_OWNER}"
echo "  updateGateOwner     = ${UPDATE_GATE_OWNER}"
echo "  configGateOwner     = ${CONFIG_GATE_OWNER}"
echo
echo "  treasuryOwner       = ${TREASURY_OWNER}"
echo "  opsTreasuryOwner    = ${OPS_OWNER}"
echo "  rewardEngineOwner   = ${REWARD_OWNER}"
echo "  validatorSetOwner   = ${VALSET_OWNER}"

echo
echo "[plan] validator[0] bootstrap:"
echo "  reward address      = ${VAL0_REWARD}"
echo "  stake (VOID)        = ${VAL0_STAKE}"
echo "  consensus pubkey    = ${VAL0_CONSKEY}"

# Optional RPC sanity if RPC_URL + cast are available
if [ -n "${RPC_URL:-}" ]; then
  if command -v cast >/dev/null 2>&1; then
    echo
    echo "[plan] RPC sanity (optional): RPC_URL=${RPC_URL}"
    if cast chain-id --rpc-url "$RPC_URL" 2>/tmp/void-mainnet-plan-cast.log; then
      echo "[plan] chainId(rpc) OK (see cast output above if any)"
    else
      echo "[warn] cast chain-id failed; see /tmp/void-mainnet-plan-cast.log" >&2
    fi
  else
    echo
    echo "[warn] RPC_URL is set but 'cast' is not installed; skipping RPC sanity check"
  fi
fi

echo
echo "[plan] bootstrap transaction sequence (HIGH LEVEL ONLY, no sends here):"
echo
echo "  Phase 1 — gates and governance wiring"
echo "    1. Deploy UpdateGate (chainId=2050, master/deployer key)."
echo "    2. Deploy AdminGate and wire to UpdateGate."
echo "    3. Deploy ConfigGate and point it at AdminGate."
echo
echo "  Phase 2 — validator + token + treasuries"
echo "    4. Deploy ValidatorSet (mainnet) under validatorAdmin / validatorSetOwner."
echo "    5. Register validator[0] with (reward address, stake VOID, consensus key)."
echo "    6. Deploy VoidToken (VOID) with maxSupply=333,333,333 VOID."
echo "    7. Deploy VoidTreasury and OpsTreasury and set their owners/admins."
echo
echo "  Phase 3 — emissions + premine flow"
echo "    8. Deploy RewardEngine and VoidEmissionsController; set RewardEngine owner."
echo "    9. Mint full premine (333,333,333 VOID) directly into VoidTreasury."
echo "   10. (Optional test) Treasury -> OpsTreasury -> RewardEngine -> validator[0] flow,"
echo "        consuming a small emission amount and verifying balances."
echo
echo "  Phase 4 — UpdateGate / ConfigGate finalization"
echo "   11. Use UpdateGate to record the canonical addresses for:"
echo "        - VoidToken, VoidTreasury, OpsTreasury,"
echo "        - RewardEngine, ValidatorSet, JobQueue, Receipts, etc."
echo "   12. Use ConfigGate to set core config keys (chainId, gates, treasury, reward)."
echo "   13. Lock down admin keys as per key-management plan (LUKS + hardware wallets)."
echo
echo "[plan] This script is READ-ONLY: it does not broadcast transactions."
echo "[plan] Use it as a checklist against your live JSON + hardware wallets."
