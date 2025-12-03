#!/usr/bin/env bash
set -euo pipefail

# Simple devnet ETH faucet for the devnet caller.
# Default assumption: RPC is anvil-2050 with the usual default accounts.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Defaults based on your current devnet:
# - FUND_FROM: anvil default[0], unlocked
# - CALLER_ADDR: address for DEVNET_CALLER_KEY (0x3022...)
# - FUND_VALUE: 1ether
FUND_FROM_DEFAULT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
CALLER_ADDR_DEFAULT="0x3022E757dC810E133019aC0780aB3363043fC871"
FUND_VALUE_DEFAULT="1ether"

FUND_FROM="${FUND_FROM:-$FUND_FROM_DEFAULT}"
CALLER_ADDR="$CALLER_ADDR_DEFAULT"
FUND_VALUE="$FUND_VALUE_DEFAULT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --caller)
      CALLER_ADDR="$2"
      shift 2
      ;;
    --value)
      FUND_VALUE="$2"
      shift 2
      ;;
    --from)
      FUND_FROM="$2"
      shift 2
      ;;
    --rpc-url)
      RPC_URL="$2"
      shift 2
      ;;
    *)
      echo "[fund-caller] unknown arg: $1" >&2
      echo "Usage: $0 [--rpc-url URL] [--from 0x...] [--caller 0x...] [--value 1ether]" >&2
      exit 1
      ;;
  esac
done

if ! command -v cast >/dev/null 2>&1; then
  echo "[fund-caller] ERROR: 'cast' not found in PATH. Install foundry and retry." >&2
  exit 1
fi

echo "=== [fund-caller] VOID devnet caller funding ==="
echo "REPO_ROOT   = ${REPO_ROOT}"
echo "RPC_URL     = ${RPC_URL}"
echo "FUND_FROM   = ${FUND_FROM} (expects unlocked on anvil)"
echo "CALLER_ADDR = ${CALLER_ADDR}"
echo "FUND_VALUE  = ${FUND_VALUE}"
echo

echo "--- [1] caller ETH balance BEFORE ---"
cast balance --rpc-url "${RPC_URL}" "${CALLER_ADDR}" || true
echo

echo "--- [2] send ETH from FUND_FROM -> CALLER_ADDR (unlocked) ---"
set -x
ETH_FROM="${FUND_FROM}" \
  cast send \
    --unlocked \
    --rpc-url "${RPC_URL}" \
    "${CALLER_ADDR}" \
    --value "${FUND_VALUE}"
set +x
echo

echo "--- [3] caller ETH balance AFTER ---"
cast balance --rpc-url "${RPC_URL}" "${CALLER_ADDR}" || true

echo
echo "=== [fund-caller] done ==="
