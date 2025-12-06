#!/usr/bin/env bash
set -euo pipefail

echo "=== [workcredits-devnet-plan] VOID WorkCredits devnet PLAN health ==="

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG="${CONFIG:-config/void-workcredits-devnet.live.json}"

echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] CONFIG    = $CONFIG"

if [[ ! -f "$CONFIG" ]]; then
  echo "[fatal] config file not found: $CONFIG"
  echo "[hint] run the live-ensure helper first, e.g.:"
  echo "       /tmp/void-workcredits-devnet-live-ensure.sh  (or re-create it)"
  echo
  echo "[result] WorkCredits devnet PLAN health: 0 (1=ready, 0=not-ready; missing config)"
  exit 1
fi

RPC_URL="$(jq -r '.rpcUrl // "http://127.0.0.1:8545"' "$CONFIG")"
echo "[cfg] RPC_URL   = $RPC_URL"
echo

echo "=== [1] config snapshot ==="
jq '.' "$CONFIG"
echo

echo "=== [2] basic fields from config ==="
chainId_cfg="$(jq -r '.chainId // "0"' "$CONFIG")"
network_cfg="$(jq -r '.network // "unknown"' "$CONFIG")"
voidToken="$(jq -r '.voidToken // "0x0000000000000000000000000000000000000000"' "$CONFIG")"
workCreditsToken="$(jq -r '.workCreditsToken // "0x0000000000000000000000000000000000000000"' "$CONFIG")"
lpPool="$(jq -r '.lpPool // "0x0000000000000000000000000000000000000000"' "$CONFIG")"
treasury="$(jq -r '.treasury // "0x0000000000000000000000000000000000000000"' "$CONFIG")"
opsTreasury="$(jq -r '.opsTreasury // "0x0000000000000000000000000000000000000000"' "$CONFIG")"

printf "  chainId (config) : %s\n" "$chainId_cfg"
printf "  network (config) : %s\n" "$network_cfg"
printf "  voidToken        : %s\n" "$voidToken"
printf "  workCreditsToken : %s\n" "$workCreditsToken"
printf "  lpPool           : %s\n" "$lpPool"
printf "  treasury         : %s\n" "$treasury"
printf "  opsTreasury      : %s\n" "$opsTreasury"
echo

echo "=== [3] chainId sanity via RPC ==="
chainId_rpc="error"
if command -v cast >/dev/null 2>&1; then
  chainId_rpc="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || echo "error")"
else
  echo "[warn] 'cast' not found in PATH; skipping RPC chainId check"
fi
printf "  chainId (RPC)    : %s\n" "$chainId_rpc"
echo

echo "=== [4] address sanity checks ==="

plan_ok=1

check_addr() {
  local name="$1"
  local addr="$2"
  local status="OK"
  local is_zero=0

  # Normalize and check for zero address
  if [[ "$addr" == "0x0000000000000000000000000000000000000000" ]] || \
     [[ "$addr" == "0x0000000000000000000000000000000000000000000000000000000000000000" ]] || \
     [[ "$addr" == "null" ]] || \
     [[ "$addr" == "" ]]; then
    status="MISSING"
    is_zero=1
  fi

  if [[ "$is_zero" -eq 1 ]]; then
    printf "  %-15s : %s  [MISSING]\n" "$name" "$addr"
    plan_ok=0
  else
    printf "  %-15s : %s  [OK]\n" "$name" "$addr"
  fi
}

check_addr "voidToken"        "$voidToken"
check_addr "workCreditsToken" "$workCreditsToken"
check_addr "lpPool"           "$lpPool"
check_addr "treasury"         "$treasury"
check_addr "opsTreasury"      "$opsTreasury"

# chainId mismatch also fails plan
if [[ "$chainId_rpc" != "error" ]] && [[ "$chainId_cfg" != "0" ]] && [[ "$chainId_cfg" != "$chainId_rpc" ]]; then
  echo
  echo "[warn] chainId mismatch between config and RPC (config=$chainId_cfg, rpc=$chainId_rpc)"
  plan_ok=0
fi

if [[ "$chainId_rpc" == "error" ]]; then
  echo
  echo "[warn] RPC chainId check failed or 'cast' missing; treating as not-ready for now."
  plan_ok=0
fi

echo
echo "=== [5] summary ==="
printf "  plan_ok          = %d\n" "$plan_ok"
echo
echo "[result] WorkCredits devnet PLAN health: $plan_ok (1=ready, 0=not-ready)"
# Exit code is 0 regardless; this is a reporting script, not a hard gate (yet).
exit 0
