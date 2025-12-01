#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG_PATH="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [plan-sim] VOID mainnet PLAN invariants (live JSON only) ==="
echo "[plan-sim] REPO_ROOT   = $REPO_ROOT"
echo "[plan-sim] CONFIG_PATH = $CONFIG_PATH"
echo

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[plan-sim] FATAL: config file not found: $CONFIG_PATH"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[plan-sim] FATAL: jq is required"
  exit 1
fi

CHAIN_ID="$(jq -r '.chainId' "$CONFIG_PATH" 2>/dev/null || echo "null")"
EXIT_CODE=0

if [ "$CHAIN_ID" = "null" ] || [ -z "$CHAIN_ID" ]; then
  echo "[plan-sim] ERROR: chainId missing/null in config"
  EXIT_CODE=1
else
  echo "[plan-sim] chainId = $CHAIN_ID"
  if [ "$CHAIN_ID" != "2050" ]; then
    echo "[plan-sim] WARNING: chainId != 2050 (got $CHAIN_ID)"
  fi
fi
echo

ROLES_REQ=(
  deployer
  treasuryAdmin
  opsTreasuryAdmin
  validatorAdmin
  adminGateOwner
  updateGateOwner
  configGateOwner
  treasuryOwner
  opsTreasuryOwner
  rewardEngineOwner
  validatorSetOwner
)

CONTRACTS_REQ=(
  updateGate
  adminGate
  configGate
  validatorSet
  voidToken
  premineVault
  treasury
  voidTreasury
  opsTreasury
  rewardEngine
)

MISSING_ROLES=()
for r in "${ROLES_REQ[@]}"; do
  v="$(jq -r --arg k "$r" '.roles[$k] // ""' "$CONFIG_PATH")"
  if [ -z "$v" ] || [ "$v" = "0x0000000000000000000000000000000000000000" ]; then
    MISSING_ROLES+=("$r")
  fi
done

MISSING_CONTRACTS=()
for c in "${CONTRACTS_REQ[@]}"; do
  v="$(jq -r --arg k "$c" '.contracts[$k] // ""' "$CONFIG_PATH")"
  if [ -z "$v" ] || [ "$v" = "0x0000000000000000000000000000000000000000" ]; then
    MISSING_CONTRACTS+=("$c")
  fi
done

V0_MISSING=()
V0_REWARD="$(jq -r '.validator0.reward // ""' "$CONFIG_PATH")"
V0_KEY="$(jq -r '.validator0.consensusKey // ""' "$CONFIG_PATH")"
V0_STAKE="$(jq -r '.validator0.stakeVOID // ""' "$CONFIG_PATH")"

[ -z "$V0_REWARD" ] && V0_MISSING+=("reward")
[ -z "$V0_KEY" ] && V0_MISSING+=("consensusKey")
[ -z "$V0_STAKE" ] && V0_MISSING+=("stakeVOID")

echo "[plan-sim] missing_roles      : ${MISSING_ROLES[*]:-(none)}"
echo "[plan-sim] missing_contracts  : ${MISSING_CONTRACTS[*]:-(none)}"
echo "[plan-sim] missing_validator0 : ${V0_MISSING[*]:-(none)}"
echo

if [ "${#MISSING_ROLES[@]}" -ne 0 ] || [ "${#V0_MISSING[@]}" -ne 0 ]; then
  echo "[plan-sim] RESULT: NOT READY (missing critical roles/validator0)"
  EXIT_CODE=1
else
  if [ "${#MISSING_CONTRACTS[@]}" -ne 0 ]; then
    echo "[plan-sim] RESULT: ROLES OK, CONTRACTS PENDING"
    echo "[plan-sim] NOTE: missing contracts are NOT fatal for sim; this script does NOT touch metrics."
    EXIT_CODE=0
  else
    echo "[plan-sim] RESULT: READY (roles + contracts + validator0 present)"
  fi
fi

echo
echo "[plan-sim] NOTE: this script no longer writes Prometheus/node_exporter textfile metrics."
echo "[plan-sim]       PLAN health metrics are controlled by the dev PLAN exporter only."
exit "$EXIT_CODE"
