#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

echo "=== [mainnet-bootstrap-plan-status] VOID mainnet PLAN status ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo "[cfg] PROM_URL    = $PROM_URL"
echo

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[FATAL] config file not found: $CONFIG_PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq is required but not found in PATH." >&2
  exit 1
fi

echo "=== [0] chainId ==="
jq -r '.chainId as $c | "  chainId (config): \($c)"' "$CONFIG_PATH"
echo

echo "=== [1] roles (ZERO vs SET) ==="
jq -r '
  def flag_zero(a):
    if (a|tostring|ascii_downcase) == "0x0000000000000000000000000000000000000000" then "ZERO"
    else "SET"
    end;
  .roles as $r
  | [
      "deployer",
      "treasuryAdmin",
      "opsTreasuryAdmin",
      "validatorAdmin",
      "adminGateOwner",
      "updateGateOwner",
      "configGateOwner",
      "treasuryOwner",
      "opsTreasuryOwner",
      "rewardEngineOwner",
      "validatorSetOwner"
    ]
  | map( . as $k | "  \($k) : \($r[$k]) (\(flag_zero($r[$k])))" )
  | .[]
' "$CONFIG_PATH"
echo

echo "=== [2] contracts (ZERO vs SET) ==="
jq -r '
  def flag_zero(a):
    if (a|tostring|ascii_downcase) == "0x0000000000000000000000000000000000000000" then "ZERO"
    else if (a|tostring) == "" then "EMPTY" else "SET" end
    end;
  .contracts as $c
  | [
      "updateGate",
      "adminGate",
      "configGate",
      "validatorSet",
      "voidToken",
      "premineVault",
      "treasury",
      "voidTreasury",
      "opsTreasury",
      "rewardEngine"
    ]
  | map( . as $k | "  \($k) : \($c[$k]) (\(flag_zero($c[$k])))" )
  | .[]
' "$CONFIG_PATH"
echo

echo "=== [3] validator0 (ZERO vs SET) ==="
jq -r '
  def flag_zero_addr(a):
    if (a|tostring|ascii_downcase) == "0x0000000000000000000000000000000000000000" then "ZERO"
    else "SET"
    end;
  def flag_zero_bytes32(a):
    if (a|tostring|ascii_downcase) == "0x0000000000000000000000000000000000000000000000000000000000000000" then "ZERO"
    else "SET"
    end;
  .validator0 as $v
  | [
      "reward",
      "consensusKey",
      "stakeVOID"
    ]
  | map(
      if . == "reward" then
        "  reward       : \($v.reward) (\(flag_zero_addr($v.reward)))"
      elif . == "consensusKey" then
        "  consensusKey : \($v.consensusKey) (\(flag_zero_bytes32($v.consensusKey)))"
      else
        "  stakeVOID    : \($v.stakeVOID // "null") (STRING/TODO)"
      end
    )
  | .[]
' "$CONFIG_PATH"
echo

echo "=== [4] exporter gauges (if Prometheus is up) ==="
plan_configured="N/A"
plan_health="N/A"

if command -v curl >/dev/null 2>&1; then
  if RESP_CFG=$(curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_configured" 2>/dev/null || true); then
    val_cfg=$(printf '%s\n' "$RESP_CFG" | jq -r '.data.result[0].value[1] // empty' || true)
    [ -n "$val_cfg" ] && plan_configured="$val_cfg"
  fi

  if RESP_HLT=$(curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_bootstrap_plan_health" 2>/dev/null || true); then
    val_hlt=$(printf '%s\n' "$RESP_HLT" | jq -r '.data.result[0].value[1] // empty' || true)
    [ -n "$val_hlt" ] && plan_health="$val_hlt"
  fi
else
  echo "  [warn] curl not found; skipping Prometheus queries."
fi

echo "  void_mainnet_bootstrap_plan_configured = $plan_configured"
echo "  void_mainnet_bootstrap_plan_health     = $plan_health"
echo

echo "=== [5] interpretation hint ==="
echo "  - ZERO/EMPTY entries above are the ones that must be filled before plan_health can safely be 1."
echo "  - This script is read-only: it DOES NOT broadcast or deploy anything."
echo
