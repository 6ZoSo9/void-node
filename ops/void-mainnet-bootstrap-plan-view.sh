#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [bootstrap-plan-view] VOID mainnet bootstrap PLAN view ==="
echo "[cfg] REPO_ROOT   = $PWD"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[FATAL] config file not found: $CONFIG_PATH" >&2
  exit 1
fi

# Helpers (mirrors checklist logic)
norm_addr() {
  local raw="$1"
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

echo "=== [0] chainId ==="
CHAIN_JSON="$(jq -r '.chainId // 0' "$CONFIG_PATH")"
printf "  chainId (config) : %s\n" "$CHAIN_JSON"
echo

echo "=== [1] roles (PLAN view) ==="
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
  echo "  -> PLAN missing/zero roles: ${MISSING_ROLES[*]}"
else
  echo "  -> All tracked PLAN roles are non-zero."
fi
echo

echo "=== [2] contracts (PLAN view) ==="
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
  val="$(jq -r --arg k "$key" '.contracts[$k] // ""' "$CONFIG_PATH")"
  val="$(norm_addr "$val")"
  printf "  %-14s : %s\n" "$key" "${val:-<empty>}"
  case "$key" in
    voidToken|premineVault|treasury|opsTreasury|rewardEngine)
      if is_zero_addr "$val"; then
        MISSING_CONTRACTS+=("$key")
      fi
      ;;
  esac
done

if [ "${#MISSING_CONTRACTS[@]}" -gt 0 ]; then
  echo "  -> PLAN missing/zero CRITICAL contracts: ${MISSING_CONTRACTS[*]}"
else
  echo "  -> All CRITICAL PLAN contracts non-zero (voidToken/premineVault/treasury/opsTreasury/rewardEngine)."
fi
echo

echo "=== [3] validator0 (PLAN view) ==="
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
  echo "  -> PLAN missing/zero validator0 critical fields: ${MISSING_VALIDATOR_CRIT[*]}"
else
  echo "  -> validator0 critical PLAN fields (reward + consensusKey) are non-zero."
fi
echo

echo "=== [4] PLAN structural verdict ==="
STRUCT_HEALTH=1

if [ "${#MISSING_CONTRACTS[@]}" -gt 0 ]; then
  STRUCT_HEALTH=0
fi
if [ "${#MISSING_VALIDATOR_CRIT[@]}" -gt 0 ]; then
  STRUCT_HEALTH=0
fi

if [ "$STRUCT_HEALTH" -eq 1 ]; then
  echo "  PLAN_STATUS : READY-ish (all critical fields populated; contracts+validator0 look structurally OK)"
  echo "  NOTE        : still need Prometheus plan_health wiring + human review before broadcast."
else
  echo "  PLAN_STATUS : NOT_READY (one or more critical PLAN fields are missing/zero)"
  echo "  DETAILS     :"
  echo "    - Missing contracts : ${MISSING_CONTRACTS[*]:-<none>}"
  echo "    - Missing validator : ${MISSING_VALIDATOR_CRIT[*]:-<none>}"
fi

echo
echo "=== [bootstrap-plan-view] done ==="

# Exit code for CI/gates: 0 if structurally READY-ish, 1 if NOT_READY.
if [ "$STRUCT_HEALTH" -eq 1 ]; then
  exit 0
else
  exit 1
fi
