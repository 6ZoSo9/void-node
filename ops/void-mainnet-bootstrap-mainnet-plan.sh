#!/usr/bin/env bash
set -euo pipefail

# PLAN-only harness for VOID mainnet bootstrap:
# - Reads a mainnet config JSON (template or *.live.json)
# - Prints a human-readable plan (chainId + addresses)
# - Writes a textfile metric: void_mainnet_bootstrap_plan_ready
# - Exits 0 if checks pass, 1 otherwise.

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG_PATH="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"

TEXTFILE_DIR="${TEXTFILE_DIR:-$REPO_ROOT/ops/textfile}"
METRIC_FILE="${TEXTFILE_DIR}/void_mainnet_bootstrap_plan.prom"

echo "=== [mainnet-bootstrap-plan] VOID mainnet bootstrap PLAN ==="
echo "[info] REPO_ROOT   = $REPO_ROOT"
echo "[info] CONFIG_PATH = $CONFIG_PATH"
echo "[info] METRIC_FILE = $METRIC_FILE"
echo

PLAN_OK=1
CHAIN_ID=""

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[error] config file not found: $CONFIG_PATH" >&2
  PLAN_OK=0
else
  if ! command -v jq >/dev/null 2>&1; then
    echo "[fatal] jq not installed; cannot parse JSON" >&2
    PLAN_OK=0
  else
    # chainId from root or nested
    CHAIN_ID="$(jq -r '.chainId // .config.chainId // empty' "$CONFIG_PATH" 2>/dev/null || echo "")"

    echo "==[1] Chain & config sanity =="
    if [[ -z "$CHAIN_ID" || "$CHAIN_ID" == "null" ]]; then
      echo "[error] chainId not found in config JSON (.chainId or .config.chainId)" >&2
      PLAN_OK=0
    else
      echo "  config chainId : $CHAIN_ID"
      if [[ "$CHAIN_ID" != "2050" ]]; then
        echo "  [!] EXPECTED chainId 2050 but got $CHAIN_ID" >&2
        PLAN_OK=0
      else
        echo "  [ok] chainId matches VOID mainnet (2050)"
      fi
    fi
    echo

    echo "==[2] Core addresses from config (addresses.*) =="
    ADDR_TOKEN="$(jq -r '.addresses.voidToken       // empty' "$CONFIG_PATH" 2>/dev/null || echo "")"
    ADDR_TREASURY="$(jq -r '.addresses.voidTreasury // empty' "$CONFIG_PATH" 2>/dev/null || echo "")"
    ADDR_OPS_TREASURY="$(jq -r '.addresses.opsTreasury // empty' "$CONFIG_PATH" 2>/dev/null || echo "")"
    ADDR_ADMIN_GATE="$(jq -r '.addresses.adminGate  // empty' "$CONFIG_PATH" 2>/dev/null || echo "")"
    ADDR_UPDATE_GATE="$(jq -r '.addresses.updateGate // empty' "$CONFIG_PATH" 2>/dev/null || echo "")"
    ADDR_VALIDATOR_SET="$(jq -r '.addresses.validatorSet // empty' "$CONFIG_PATH" 2>/dev/null || echo "")"
    ADDR_REWARD_ENGINE="$(jq -r '.addresses.rewardEngine // empty' "$CONFIG_PATH" 2>/dev/null || echo "")"

    check_addr() {
      local key="$1"
      local val="$2"
      printf "  %-14s : %s\n" "$key" "${val:-<unset>}"
      if [[ -z "$val" || "$val" == "null" || "$val" == "0x0000000000000000000000000000000000000000" ]]; then
        echo "    [!] $key is missing or zero address" >&2
        PLAN_OK=0
      fi
    }

    check_addr "VoidToken"      "$ADDR_TOKEN"
    check_addr "VoidTreasury"   "$ADDR_TREASURY"
    check_addr "OpsTreasury"    "$ADDR_OPS_TREASURY"
    check_addr "AdminGate"      "$ADDR_ADMIN_GATE"
    check_addr "UpdateGate"     "$ADDR_UPDATE_GATE"
    check_addr "ValidatorSet"   "$ADDR_VALIDATOR_SET"
    check_addr "RewardEngine"   "$ADDR_REWARD_ENGINE"
    echo

    echo "==[3] High-level flow (conceptual) =="
    echo "  • Premine → VoidTreasury (contract-based treasury, not hot EOA)."
    echo "  • Treasury → OpsTreasury for operating budgets."
    echo "  • OpsTreasury → RewardEngine to feed emissions + validator rewards."
    echo "  • AdminGate + UpdateGate guard core upgrades (v99 freeze model)."
    echo "  • ValidatorSet defines initial validator set for VOID mainnet."
    echo "  (This script only verifies addresses + chainId; actual deployment"
    echo "   wiring remains in the Forge bootstrap script.)"
    echo
  fi
fi

mkdir -p "$TEXTFILE_DIR"

TMP="${METRIC_FILE}.tmp.$$"
{
  echo "# HELP void_mainnet_bootstrap_plan_ready 1 if mainnet bootstrap config passes basic sanity checks"
  echo "# TYPE void_mainnet_bootstrap_plan_ready gauge"
  echo "void_mainnet_bootstrap_plan_ready $PLAN_OK"

  echo "# HELP void_mainnet_bootstrap_plan_chainid Config chainId from live JSON (0 if missing)"
  echo "# TYPE void_mainnet_bootstrap_plan_chainid gauge"
  if [[ -n "$CHAIN_ID" ]]; then
    echo "void_mainnet_bootstrap_plan_chainid $CHAIN_ID"
  else
    echo "void_mainnet_bootstrap_plan_chainid 0"
  fi
} >"$TMP"

mv "$TMP" "$METRIC_FILE"

echo "==[4] Metric written =="
echo "  $(wc -l <"$METRIC_FILE") lines -> $METRIC_FILE"
echo

if [[ "$PLAN_OK" -eq 1 ]]; then
  echo "[result] OK   – void_mainnet_bootstrap_plan_ready = 1"
  exit 0
else
  echo "[result] FAIL – void_mainnet_bootstrap_plan_ready = 0 (see messages above)"
  exit 1
fi
