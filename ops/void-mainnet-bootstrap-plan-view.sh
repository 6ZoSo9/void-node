#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [bootstrap-plan-view] VOID mainnet bootstrap PLAN view ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo

cd "$REPO_ROOT"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[FATAL] config file not found: $CONFIG_PATH" >&2
  # This is a real error: missing config, so we *do* exit non-zero here.
  exit 1
fi

# Helper to safely jq a key (assumes structure is correct for our live.json template).
jq_str() {
  jq -r "$1" "$CONFIG_PATH"
}

echo "=== [0] chainId ==="
CHAIN_ID="$(jq_str '.chainId')"
echo "  chainId (config) : $CHAIN_ID"
echo

echo "=== [1] roles (PLAN view) ==="
DEPLOYER="$(jq_str '.roles.deployer')"
TREASURY_ADMIN="$(jq_str '.roles.treasuryAdmin')"
OPS_TREASURY_ADMIN="$(jq_str '.roles.opsTreasuryAdmin')"
VALIDATOR_ADMIN="$(jq_str '.roles.validatorAdmin')"
ADMIN_GATE_OWNER="$(jq_str '.roles.adminGateOwner')"
UPDATE_GATE_OWNER="$(jq_str '.roles.updateGateOwner')"
CONFIG_GATE_OWNER="$(jq_str '.roles.configGateOwner')"
TREASURY_OWNER="$(jq_str '.roles.treasuryOwner')"
OPS_TREASURY_OWNER="$(jq_str '.roles.opsTreasuryOwner')"
REWARD_ENGINE_OWNER="$(jq_str '.roles.rewardEngineOwner')"
VALIDATOR_SET_OWNER="$(jq_str '.roles.validatorSetOwner')"

echo "  deployer           : $DEPLOYER"
echo "  treasuryAdmin      : $TREASURY_ADMIN"
echo "  opsTreasuryAdmin   : $OPS_TREASURY_ADMIN"
echo "  validatorAdmin     : $VALIDATOR_ADMIN"
echo "  adminGateOwner     : $ADMIN_GATE_OWNER"
echo "  updateGateOwner    : $UPDATE_GATE_OWNER"
echo "  configGateOwner    : $CONFIG_GATE_OWNER"
echo "  treasuryOwner      : $TREASURY_OWNER"
echo "  opsTreasuryOwner   : $OPS_TREASURY_OWNER"
echo "  rewardEngineOwner  : $REWARD_ENGINE_OWNER"
echo "  validatorSetOwner  : $VALIDATOR_SET_OWNER"

missing_roles=()
[ "$DEPLOYER"         = "0x0000000000000000000000000000000000000000" ] && missing_roles+=("deployer")
[ "$TREASURY_ADMIN"   = "0x0000000000000000000000000000000000000000" ] && missing_roles+=("treasuryAdmin")
[ "$OPS_TREASURY_ADMIN" = "0x0000000000000000000000000000000000000000" ] && missing_roles+=("opsTreasuryAdmin")
[ "$VALIDATOR_ADMIN"  = "0x0000000000000000000000000000000000000000" ] && missing_roles+=("validatorAdmin")

if [ "${#missing_roles[@]}" -gt 0 ]; then
  echo "  -> PLAN missing/zero roles: ${missing_roles[*]}"
fi
echo

echo "=== [2] contracts (PLAN view) ==="
UPDATE_GATE_ADDR="$(jq_str '.contracts.updateGate')"
ADMIN_GATE_ADDR="$(jq_str '.contracts.adminGate')"
CONFIG_GATE_ADDR="$(jq_str '.contracts.configGate')"
VALIDATOR_SET_ADDR="$(jq_str '.contracts.validatorSet')"
VOID_TOKEN_ADDR="$(jq_str '.contracts.voidToken')"
VOID_TREASURY_ADDR="$(jq_str '.contracts.voidTreasury')"
OPS_TREASURY_ADDR="$(jq_str '.contracts.opsTreasury')"
REWARD_ENGINE_ADDR="$(jq_str '.contracts.rewardEngine')"

# premineVault/treasury might be absent or empty strings
PREMINE_VAULT_ADDR="$(jq -r '.contracts.premineVault // ""' "$CONFIG_PATH")"
TREASURY_ADDR="$(jq -r '.contracts.treasury // ""' "$CONFIG_PATH")"

echo "  updateGate     : $UPDATE_GATE_ADDR"
echo "  adminGate      : $ADMIN_GATE_ADDR"
echo "  configGate     : $CONFIG_GATE_ADDR"
echo "  validatorSet   : $VALIDATOR_SET_ADDR"
echo "  voidToken      : $VOID_TOKEN_ADDR"
echo "  premineVault   : ${PREMINE_VAULT_ADDR:-<empty>}"
echo "  treasury       : ${TREASURY_ADDR:-<empty>}"
echo "  voidTreasury   : $VOID_TREASURY_ADDR"
echo "  opsTreasury    : $OPS_TREASURY_ADDR"
echo "  rewardEngine   : $REWARD_ENGINE_ADDR"

missing_contracts=()
[ "$VOID_TOKEN_ADDR"   = "0x0000000000000000000000000000000000000000" ] && missing_contracts+=("voidToken")
[ -z "${PREMINE_VAULT_ADDR:-}" ] && missing_contracts+=("premineVault")
[ -z "${TREASURY_ADDR:-}" ] && missing_contracts+=("treasury")
[ "$OPS_TREASURY_ADDR" = "0x0000000000000000000000000000000000000000" ] && missing_contracts+=("opsTreasury")
[ "$REWARD_ENGINE_ADDR"= "0x0000000000000000000000000000000000000000" ] && missing_contracts+=("rewardEngine")

if [ "${#missing_contracts[@]}" -gt 0 ]; then
  echo "  -> PLAN missing/zero CRITICAL contracts: ${missing_contracts[*]}"
fi
echo

echo "=== [3] validator0 (PLAN view) ==="
VAL0_REWARD_ADDR="$(jq_str '.validator0.reward')"
VAL0_CONS_KEY="$(jq_str '.validator0.consensusKey')"
VAL0_STAKE_RAW="$(jq_str '.validator0.stakeVOID')"

echo "  reward address    : $VAL0_REWARD_ADDR"
echo "  consensusKey      : $VAL0_CONS_KEY"
echo "  stakeVOID (raw)   : $VAL0_STAKE_RAW"

missing_validator_fields=()
[ "$VAL0_REWARD_ADDR" = "0x0000000000000000000000000000000000000000" ] && missing_validator_fields+=("reward")
[ "$VAL0_CONS_KEY"    = "0x0000000000000000000000000000000000000000000000000000000000000000" ] && missing_validator_fields+=("consensusKey")

if [ "${#missing_validator_fields[@]}" -gt 0 ]; then
  echo "  -> PLAN missing/zero validator0 critical fields: ${missing_validator_fields[*]}"
fi
echo

echo "=== [4] PLAN structural verdict ==="
PLAN_STATUS="READY"
if [ "${#missing_contracts[@]}" -gt 0 ] || [ "${#missing_validator_fields[@]}" -gt 0 ]; then
  PLAN_STATUS="NOT_READY"
fi

echo "  PLAN_STATUS : $PLAN_STATUS (one or more critical PLAN fields are missing/zero)"
if [ "${#missing_contracts[@]}" -gt 0 ]; then
  echo "  DETAILS     :"
  echo "    - Missing contracts : ${missing_contracts[*]}"
fi
if [ "${#missing_validator_fields[@]}" -gt 0 ]; then
  if [ "${#missing_contracts[@]}" -eq 0 ]; then
    echo "  DETAILS     :"
  fi
  echo "    - Missing validator : ${missing_validator_fields[*]}"
fi
echo
echo "=== [bootstrap-plan-view] done ==="

# IMPORTANT: this script is *report-only*.
# It should exit 0 even when PLAN_STATUS=NOT_READY.
exit 0
