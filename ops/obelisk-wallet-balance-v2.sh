#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NETWORK="devnet"
ROLE=""
TOKEN_ADDR=""
WALLET_ADDR=""
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

MAINNET_LIVE_CFG="$REPO_ROOT/config/void-mainnet-bootstrap-mainnet.live.json"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--network devnet|mainnet-phase1] [--role ROLE_ID] [--token 0xTOKEN] [--address 0xWALLET]

Examples:

  # Devnet, explicit token + wallet
  RPC_URL=http://127.0.0.1:8545 \\
    $(basename "$0") \\
      --network devnet \\
      --token 0xTOKEN \\
      --address 0xWALLET

  # Mainnet Phase 1, infer treasuryOwner address + token from LIVE config
  RPC_URL=https://rpc.void-mainnet.example \\
    $(basename "$0") \\
      --network mainnet-phase1 \\
      --role treasuryOwner
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --role)
      ROLE="$2"
      shift 2
      ;;
    --token)
      TOKEN_ADDR="$2"
      shift 2
      ;;
    --address|--addr)
      WALLET_ADDR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

# Resolve WALLET_ADDR from role (for mainnet-phase1), if needed
if [[ -z "${WALLET_ADDR:-}" ]]; then
  if [[ "$NETWORK" == "mainnet-phase1" && -n "$ROLE" ]]; then
    if ! command -v jq >/dev/null 2>&1; then
      echo "ERROR: jq is required to resolve roles from $MAINNET_LIVE_CFG" >&2
      exit 1
    fi
    if [[ ! -f "$MAINNET_LIVE_CFG" ]]; then
      echo "ERROR: LIVE config not found: $MAINNET_LIVE_CFG" >&2
      exit 1
    fi
    WALLET_ADDR="$(jq -r ".roles.\"$ROLE\"" "$MAINNET_LIVE_CFG")"
    if [[ "$WALLET_ADDR" == "null" || "$WALLET_ADDR" == "0x0000000000000000000000000000000000000000" ]]; then
      echo "ERROR: WALLET_ADDR for role '$ROLE' is zero or missing in $MAINNET_LIVE_CFG" >&2
      exit 1
    fi
  fi
fi

if [[ -z "${WALLET_ADDR:-}" ]]; then
  echo "ERROR: WALLET_ADDR is not set." >&2
  echo "  - Pass --address 0x... explicitly;" >&2
  echo "  - Or, for --network mainnet-phase1, pass --role ROLE_ID and ensure roles.* is set in LIVE config." >&2
  exit 1
fi

# Resolve TOKEN_ADDR if not provided explicitly
if [[ -z "${TOKEN_ADDR:-}" ]]; then
  if [[ "$NETWORK" == "mainnet-phase1" ]]; then
    if ! command -v jq >/dev/null 2>&1; then
      echo "ERROR: jq is required to resolve token from $MAINNET_LIVE_CFG" >&2
      exit 1
    fi
    if [[ ! -f "$MAINNET_LIVE_CFG" ]]; then
      echo "ERROR: LIVE config not found: $MAINNET_LIVE_CFG" >&2
      exit 1
    fi
    TOKEN_ADDR="$(jq -r '.contracts.voidToken' "$MAINNET_LIVE_CFG")"
    if [[ "$TOKEN_ADDR" == "null" || "$TOKEN_ADDR" == "0x0000000000000000000000000000000000000000" ]]; then
      echo "ERROR: TOKEN_ADDR is not set." >&2
      echo "  - Pass --token 0x... explicitly;" >&2
      echo "  - Or ensure .contracts.voidToken is non-zero in $MAINNET_LIVE_CFG" >&2
      exit 1
    fi
  else
    echo "ERROR: TOKEN_ADDR is not set." >&2
    echo "  - Pass --token 0x... explicitly;" >&2
    exit 1
  fi
fi

echo "=== [obelisk] VOID balance inspector v2 ==="
echo "REPO_ROOT   = $REPO_ROOT"
echo "NETWORK     = $NETWORK"
echo "RPC_URL     = $RPC_URL"
echo "TOKEN_ADDR  = $TOKEN_ADDR"
echo "WALLET_ADDR = $WALLET_ADDR"

if ! command -v cast >/dev/null 2>&1; then
  echo "ERROR: foundry 'cast' is required on PATH" >&2
  exit 1
fi

echo
echo "--- [1] raw on-chain balance ---"
raw_out="$(cast call "$TOKEN_ADDR" "balanceOf(address)(uint256)" "$WALLET_ADDR" --rpc-url "$RPC_URL" | tr -d '\r' | tr -d '\n')"
raw_out="$(echo "$raw_out" | xargs || true)"

if [[ -z "$raw_out" ]]; then
  echo "ERROR: empty response from cast call" >&2
  exit 1
fi

# Strip any annotation (e.g. ' [3.333e26]') after first space
raw_core="${raw_out%% *}"

raw_dec=""
if [[ "$raw_core" =~ ^0x[0-9a-fA-F]+$ ]]; then
  raw_dec="$(cast --to-dec "$raw_core")"
else
  raw_dec="$raw_core"
fi

echo "raw_balance (raw_out)  = $raw_out"
echo "raw_balance (raw_core) = $raw_core"
echo "raw_balance (uint256)  = $raw_dec"

echo
echo "--- [2] human-readable (18 decimals) ---"
human="$(cast --from-wei "$raw_dec")"
echo "balance_human (VOID) = $human"
