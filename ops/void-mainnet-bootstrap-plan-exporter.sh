#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
METRICS_DIR="${METRICS_DIR:-$REPO_ROOT/ops/metrics}"
METRICS_FILE="$METRICS_DIR/void_mainnet_bootstrap_plan.prom"

echo "=== [plan-exporter] VOID mainnet bootstrap PLAN exporter ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo "[cfg] METRICS_DIR = $METRICS_DIR"
echo "[cfg] METRICS_FILE= $METRICS_FILE"
echo

cd "$REPO_ROOT"

CONFIG_OK=0
STRUCT_OK=0

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[plan-exporter] ERROR: config file not found: $CONFIG_PATH" >&2
else
  if ! command -v jq >/dev/null 2>&1; then
    echo "[plan-exporter] ERROR: jq not found; cannot parse config." >&2
  else
    if OUT=$(jq -r '
      def is_unset_addr(a):
        a == null or ((a|tostring|ascii_downcase) == "0x0000000000000000000000000000000000000000");
      def is_unset_bytes32(a):
        a == null or ((a|tostring|ascii_downcase) == "0x0000000000000000000000000000000000000000000000000000000000000000");

      def cfg_ok:
        if (.chainId == 2050 and has("roles") and has("contracts") and has("validator0"))
        then 1 else 0 end;

      def roles_bad:
        if has("roles") and (.roles != null) then
          (.roles as $r
           | ["deployer","treasuryAdmin","opsTreasuryAdmin","validatorAdmin"]
           | map(is_unset_addr($r[.]))
           | any)
        else
          true
        end;

      def contracts_bad:
        if has("contracts") and (.contracts != null) then
          (.contracts as $c
           | ["voidToken","premineVault","treasury","opsTreasury","rewardEngine"]
           | map(is_unset_addr($c[.]))
           | any)
        else
          true
        end;

      def val_bad:
        if has("validator0") and (.validator0 != null) then
          (.validator0 as $v
           | [
               is_unset_addr($v.reward),
               is_unset_bytes32($v.consensusKey),
               (($v.stakeVOID // "TODO_SET_STAKE_VOID") == "TODO_SET_STAKE_VOID")
             ]
           | any)
        else
          true
        end;

      "\(cfg_ok) \(if roles_bad or contracts_bad or val_bad then 0 else 1 end)"
    ' "$CONFIG_PATH" 2>/dev/null); then
      read -r CONFIG_OK STRUCT_OK <<<"$OUT"
      CONFIG_OK="${CONFIG_OK:-0}"
      STRUCT_OK="${STRUCT_OK:-0}"
    else
      echo "[plan-exporter] ERROR: jq evaluation failed; treating as not configured/not healthy." >&2
      CONFIG_OK=0
      STRUCT_OK=0
    fi
  fi
fi

echo "[plan-exporter] CONFIG_OK  = $CONFIG_OK"
echo "[plan-exporter] STRUCT_OK  = $STRUCT_OK"
echo

mkdir -p "$METRICS_DIR"

TMP_FILE="$METRICS_FILE.$$"
{
  echo "# HELP void_mainnet_bootstrap_plan_configured Is mainnet bootstrap plan structurally configured (config JSON sane)?"
  echo "# TYPE void_mainnet_bootstrap_plan_configured gauge"
  echo "void_mainnet_bootstrap_plan_configured $CONFIG_OK"
  echo
  echo "# HELP void_mainnet_bootstrap_plan_health Are all critical roles/contracts/validator0 fields wired for mainnet bootstrap?"
  echo "# TYPE void_mainnet_bootstrap_plan_health gauge"
  echo "void_mainnet_bootstrap_plan_health $STRUCT_OK"
  echo
} > "$TMP_FILE"

mv "$TMP_FILE" "$METRICS_FILE"

echo "[plan-exporter] wrote metrics to $METRICS_FILE"
echo "=== [plan-exporter] DONE ==="
