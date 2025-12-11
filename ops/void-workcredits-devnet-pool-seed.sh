#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
STATE="${STATE:-$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

cd "$ROOT"

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq is required (sudo apt install jq)" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERROR] cast (foundry) is required; ensure foundryup installed and on PATH" >&2
  exit 1
fi

echo "=== [WorkCredits DEVNET pool seed] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] STATE    = $STATE"
echo "[cfg] RPC_URL  = $RPC_URL"

# 1) Allow manual override via POOL_ADDR
if [ -n "${POOL_ADDR:-}" ]; then
  echo "[info] POOL_ADDR provided via env: $POOL_ADDR"
  ADDR="$POOL_ADDR"
else
  echo
  echo "=== [1] attempt to read pool address from devnet state json ] ==="
  ADDR="$(jq -r '
    (
      .workCreditsPoolV1.address? //
      .workCreditsPoolV1? //
      .contracts?.workCreditsPoolV1?.address? //
      .contracts?.WorkCreditsPoolV1?.address?
    ) // ""' "$STATE" 2>/dev/null || echo "")"

  if [ -n "$ADDR" ] && [ "$ADDR" != "null" ] && [ "$ADDR" != "0x0000000000000000000000000000000000000000" ]; then
    echo "[info] pool address from state = $ADDR"
  else
    echo "[ERROR] could not resolve WorkCreditsPoolV1 address from $STATE" >&2
    echo
    echo "=== [debug] top-level keys + any workCredits fields ] ==="
    jq '{
      keys: (keys),
      workCreditsPoolV1: .workCreditsPoolV1,
      contracts_workCreditsPoolV1: .contracts?.workCreditsPoolV1?,
      contracts_WorkCreditsPoolV1: .contracts?.WorkCreditsPoolV1?
    }' "$STATE" 2>/dev/null || echo "[WARN] jq debug on STATE failed"
    exit 1
  fi
fi

POOL_ADDR="$ADDR"

# 2) Load devnet caller key
if [ -n "${DEVNET_CALLER_KEY:-}" ]; then
  KEY="$DEVNET_CALLER_KEY"
  echo "[info] using DEVNET_CALLER_KEY from env (len=${#KEY})"
else
  KEY_FILE="$ROOT/.secrets/devnet-caller.key"
  if [ ! -f "$KEY_FILE" ]; then
    echo "[ERROR] DEVNET_CALLER_KEY not set and $KEY_FILE missing" >&2
    exit 1
  fi
  KEY="$(tr -d ' \n' < "$KEY_FILE")"
  echo "[info] loaded devnet caller key from $KEY_FILE (len=${#KEY})"
fi

# 2b) Best-effort: show from address
FROM_ADDR="$(cast wallet address "$KEY" 2>/dev/null || echo "unknown")"
echo "[info] from address (devnet caller) = $FROM_ADDR"

# 3) Devnet-only seed amounts (human units, 18 decimals on-chain)
VOID_NATIVE=10000      # 10k VOID
WC_NATIVE=1000000      # 1m WC  => ~100 WC per 1 VOID initial price (devnet only)

VOID_SEED="$(cast --to-wei "$VOID_NATIVE" ether)"
WC_SEED="$(cast --to-wei "$WC_NATIVE" ether)"

echo
echo "=== [2] final config before send ] ==="
echo "  POOL_ADDR   = $POOL_ADDR"
echo "  FROM_ADDR   = $FROM_ADDR"
echo "  VOID_NATIVE = $VOID_NATIVE  -> $VOID_SEED wei"
echo "  WC_NATIVE   = $WC_NATIVE    -> $WC_SEED wei"

echo
echo "=== [balances BEFORE] ==="
ETH_BAL="$(cast balance "$FROM_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo "unknown")"
echo "  ETH balance(from) = $ETH_BAL wei (devnet gas)"

echo
echo "=== [3] sending seed() tx with explicit gas limit ] ==="
set -x
cast send "$POOL_ADDR" \
  "seed(uint256,uint256)" "$VOID_SEED" "$WC_SEED" \
  --rpc-url "$RPC_URL" \
  --private-key "$KEY" \
  --gas-limit 2000000
set +x

echo
echo "[RESULT] devnet pool seed tx submitted successfully (check WorkCredits devnet dashboard + logs)."
