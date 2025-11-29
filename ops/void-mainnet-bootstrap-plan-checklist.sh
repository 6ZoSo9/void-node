#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [bootstrap-plan-checklist] VOID mainnet bootstrap PLAN checklist ==="
echo "[cfg] REPO_ROOT   = $PWD"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo "[cfg] RPC_URL     = $RPC_URL"
echo

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[FATAL] config file not found: $CONFIG_PATH" >&2
  exit 1
fi

# Helper: normalize address / treat null/"null" as empty
norm_addr() {
  local raw="$1"
  # strip quotes/null markers if any
  if [ "$raw" = "null" ] || [ "$raw" = "NULL" ]; then
    echo ""
  else
    echo "$raw"
  fi
}

is_zero_addr() {
  local a
  a="$(norm_addr "$1")"
  if [ -z "$a" ]; then
    return 0
  fi
  if [ "$a" = "0x0000000000000000000000000000000000000000" ]; then
    return 0
  fi
  return 1
}

is_zero_bytes32() {
  local v="$1"
  if [ -z "$v" ]; then
    return 1
  fi
  if [ "$v" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    return 0
  fi
  return 1
}

echo "=== [0] chainId sanity ==="
CHAIN_JSON="$(jq -r '.chainId // 0' "$CONFIG_PATH")"
echo "  chainId (config) : $CHAIN_JSON"

if command -v cast >/dev/null 2>&1; then
  set +e
  RUNTIME_CHAINID_RAW="$(cast chain-id "$RPC_URL" 2>/dev/null)"
  RUNTIME_RC=$?
  set -e
  if [ $RUNTIME_RC -eq 0 ]; then
    echo "  chainId (RPC)    : $RUNTIME_CHAINID_RAW"
    if [ "$RUNTIME_CHAINID_RAW" = "$CHAIN_JSON" ]; then
      echo "  -> chainId sanity: OK"
    else
      echo "  -> chainId sanity: MISMATCH (config=$CHAIN_JSON, rpc=$RUNTIME_CHAINID_RAW)"
    fi
  else
    echo "  chainId (RPC)    : ERROR (cast chain-id failed; RPC down or not anvil-2050?)"
  fi
else
  echo "  cast not found; skipping runtime chainId check."
fi
echo

echo "=== [1] roles ==="

# Roles we care about
ROLE_KEYS=(
  "deployer"
  "treasuryAdmin"
  "opsTreasuryAdmin"
  "validatorAdmin"
  "adminGateOwner"
  "updateGateOwner"
  "configGateOwner"
  "treasuryOwner"
  "opsTreasuryOwner"
  "rewardEngineOwner"
  "validatorSetOwner"
)

MISSING_ROLES=()

for key in "${ROLE_KEYS[@]}"; do
  val="$(jq -r --arg k "$key" '.roles[$k] // ""' "$CONFIG_PATH")"
  val="$(norm_addr "$val")"
  printf "  %-18s : %s\n" "$key" "${val:-<empty>}"
  if is_zero_addr "$val"; then
    MISSING_ROLES+=("$key")
  fi
done

if [ "${#MISSING_ROLES[@]}" -gt 0 ]; then
  echo "  -> missing/zero roles: ${MISSING_ROLES[*]}"
else
  echo "  -> all tracked roles non-zero."
fi
echo

echo "=== [2] contracts ==="

# Contracts as per exporter warnings + extras
CONTRACT_KEYS=(
  "updateGate"
  "adminGate"
  "configGate"
  "validatorSet"
  "voidToken"
  "premineVault"
  "treasury"
  "voidTreasury"
  "opsTreasury"
  "rewardEngine"
)

MISSING_CONTRACTS=()

for key in "${CONTRACT_KEYS[@]}"; do
  # Some may not exist; jq will return empty
  val="$(jq -r --arg k "$key" '.contracts[$k] // ""' "$CONFIG_PATH")"
  val="$(norm_addr "$val")"
  printf "  %-14s : %s\n" "$key" "${val:-<empty>}"
  # Only treat the critical ones as structural for now
  case "$key" in
    voidToken|premineVault|treasury|opsTreasury|rewardEngine)
      if is_zero_addr "$val"; then
        MISSING_CONTRACTS+=("$key")
      fi
      ;;
  esac
done

if [ "${#MISSING_CONTRACTS[@]}" -gt 0 ]; then
  echo "  -> missing/zero CRITICAL contracts (these gate plan_health): ${MISSING_CONTRACTS[*]}"
else
  echo "  -> all CRITICAL contracts non-zero (voidToken/premineVault/treasury/opsTreasury/rewardEngine)."
fi
echo

echo "=== [3] validator0 ==="

VAL_REWARD="$(jq -r '.validator0.reward // ""' "$CONFIG_PATH")"
VAL_REWARD="$(norm_addr "$VAL_REWARD")"
VAL_CONS_KEY="$(jq -r '.validator0.consensusKey // ""' "$CONFIG_PATH")"
VAL_STAKE_STR="$(jq -r '.validator0.stakeVOID // empty' "$CONFIG_PATH" 2>/dev/null || true)"

printf "  reward address    : %s\n" "${VAL_REWARD:-<empty>}"
printf "  consensusKey      : %s\n" "${VAL_CONS_KEY:-<empty>}"
if [ -n "$VAL_STAKE_STR" ]; then
  printf "  stakeVOID (raw)   : %s\n" "$VAL_STAKE_STR"
else
  echo "  stakeVOID (raw)   : <unset or template TODO>"
fi

MISSING_VALIDATOR_CRIT=()
if is_zero_addr "$VAL_REWARD"; then
  MISSING_VALIDATOR_CRIT+=("reward")
fi
if is_zero_bytes32 "$VAL_CONS_KEY"; then
  MISSING_VALIDATOR_CRIT+=("consensusKey")
fi

if [ "${#MISSING_VALIDATOR_CRIT[@]}" -gt 0 ]; then
  echo "  -> missing/zero CRITICAL validator0 fields: ${MISSING_VALIDATOR_CRIT[*]}"
else
  echo "  -> validator0 critical fields (reward + consensusKey) are non-zero."
fi
echo

echo "=== [4] structural summary (should roughly match exporter health) ==="

STRUCT_HEALTH=1

if [ "${#MISSING_CONTRACTS[@]}" -gt 0 ]; then
  STRUCT_HEALTH=0
fi
if [ "${#MISSING_VALIDATOR_CRIT[@]}" -gt 0 ]; then
  STRUCT_HEALTH=0
fi

echo "  plan_configured (from exporter)  : see void_mainnet_bootstrap_plan_configured gauge"
echo "  plan_health (from exporter)      : see void_mainnet_bootstrap_plan_health gauge"
echo "  plan_structural_health (local)   : $STRUCT_HEALTH  (1=READY-ish, 0=NOT_READY)"

if [ "$STRUCT_HEALTH" -eq 0 ]; then
  echo
  echo "  INTERPRETATION:"
  echo "    - One or more CRITICAL contracts or validator0 fields are still zero/missing."
  echo "    - This matches plan_health=0 in the exporter right now."
  echo "    - Before we flip plan_health to 1, we need real addresses for:"
  echo "        * contracts: ${MISSING_CONTRACTS[*]:-<none>}"
  echo "        * validator0: ${MISSING_VALIDATOR_CRIT[*]:-<none>}"
else
  echo
  echo "  INTERPRETATION:"
  echo "    - All CRITICAL contracts and validator0 fields are populated."
  echo "    - Once exporter logic is aligned, plan_health should move to 1."
fi

echo
echo "=== [bootstrap-plan-checklist] done ==="
