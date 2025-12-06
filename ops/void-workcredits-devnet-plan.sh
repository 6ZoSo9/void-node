#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root from this script's location (works fine under sudo)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$REPO_ROOT"

CONFIG="${CONFIG:-config/void-workcredits-devnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [workcredits-devnet-plan] VOID WorkCredits devnet PLAN health ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] CONFIG    = $CONFIG"
echo "[cfg] RPC_URL   = $RPC_URL"
echo

echo "=== [1] config snapshot ==="
cat "$CONFIG"
echo

echo "=== [2] basic fields from config ==="
chainId_cfg="$(jq -r '.chainId' "$CONFIG")"
network_cfg="$(jq -r '.network' "$CONFIG")"
voidToken="$(jq -r '.voidToken' "$CONFIG")"
workCreditsToken="$(jq -r '.workCreditsToken' "$CONFIG")"
lpPool="$(jq -r '.lpPool' "$CONFIG")"
treasury="$(jq -r '.treasury' "$CONFIG")"
opsTreasury="$(jq -r '.opsTreasury' "$CONFIG")"

printf "  chainId (config) : %s\n" "$chainId_cfg"
printf "  network (config) : %s\n" "$network_cfg"
printf "  voidToken        : %s\n" "$voidToken"
printf "  workCreditsToken : %s\n" "$workCreditsToken"
printf "  lpPool           : %s\n" "$lpPool"
printf "  treasury         : %s\n" "$treasury"
printf "  opsTreasury      : %s\n" "$opsTreasury"
echo

echo "=== [3] chainId sanity via RPC ==="
chainId_rpc="$(cast chain-id "$RPC_URL" 2>/dev/null || echo "ERROR")"
printf "  chainId (RPC)    : %s\n" "$chainId_rpc"
echo

echo "=== [4] address sanity checks ==="
plan_ok=1

check_addr() {
  local label="$1"
  local addr="$2"
  if [[ "$addr" == "0x0000000000000000000000000000000000000000" ]]; then
    printf "  %-15s : %s  [MISSING]\n" "$label" "$addr"
    plan_ok=0
  else
    printf "  %-15s : %s  [OK]\n" "$label" "$addr"
  fi
}

check_addr "voidToken"        "$voidToken"
check_addr "workCreditsToken" "$workCreditsToken"
check_addr "lpPool"           "$lpPool"
check_addr "treasury"         "$treasury"
check_addr "opsTreasury"      "$opsTreasury"

if [[ "$plan_ok" -eq 0 ]]; then
  echo
  echo "[info] one or more addresses are still zero; plan not ready yet (expected before deployments)."
fi

echo
echo "=== [5] summary ==="
printf "  %-15s = %d\n" "plan_ok" "$plan_ok"

echo
echo "[result] WorkCredits devnet PLAN health: $plan_ok (1=ready, 0=not-ready)"
