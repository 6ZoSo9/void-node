#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CFG="$REPO_ROOT/config/void-workcredits-devnet.live.json"

if [[ ! -f "$CFG" ]]; then
  echo "[FATAL] config not found: $CFG" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq not found in PATH" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[FATAL] cast not found in PATH" >&2
  exit 1
fi

if ! command -v forge >/dev/null 2>&1; then
  echo "[FATAL] forge not found in PATH" >&2
  exit 1
fi

if [[ -z "${DEVNET_DEPLOYER_KEY:-}" ]]; then
  echo "[FATAL] DEVNET_DEPLOYER_KEY is not set" >&2
  exit 1
fi

CHAIN_ID="$(jq -r '.chainId' "$CFG")"
RPC_URL="$(jq -r '.rpcUrl' "$CFG")"
VOID_TOKEN="$(jq -r '.voidToken' "$CFG")"
WC_TOKEN="$(jq -r '.workCreditsToken' "$CFG")"
OLD_LP_POOL="$(jq -r '.lpPool' "$CFG")"

echo "=== [WC-devnet-lp] repo: $REPO_ROOT ==="
echo "CFG        = $CFG"
echo "CHAIN_ID   = $CHAIN_ID"
echo "RPC_URL    = $RPC_URL"
echo "VOID_TOKEN = $VOID_TOKEN"
echo "WC_TOKEN   = $WC_TOKEN"
echo "OLD_LPPOOL = $OLD_LP_POOL"
echo

DEVNET_DEPLOYER_ADDR="$(cast wallet address --private-key "$DEVNET_DEPLOYER_KEY")"
echo "DEVNET_DEPLOYER_ADDR = $DEVNET_DEPLOYER_ADDR"
echo

echo "=== [1] forge inspect bytecode (WorkCreditsDevnetPool) ==="
BYTECODE="$(forge inspect contracts/workcredits/WorkCreditsDevnetPool.sol:WorkCreditsDevnetPool bytecode)"
echo "bytecode length (nibbles) = ${#BYTECODE}"
echo

echo "=== [2] encode constructor(address,address) ==="
CTOR_ARGS="$(cast abi-encode "constructor(address,address)" "$VOID_TOKEN" "$WC_TOKEN")"
echo "ctor args length (nibbles) = ${#CTOR_ARGS}"
INIT_CODE="${BYTECODE}${CTOR_ARGS#0x}"
echo "init code length (nibbles) = ${#INIT_CODE}"
echo

echo "=== [3] cast send --create (WorkCreditsDevnetPool) ==="
TX_HASH="$(
  cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$DEVNET_DEPLOYER_KEY" \
    --create "$INIT_CODE"
)"
echo "TX_HASH = $TX_HASH"
echo

echo "=== [4] receipt ==="
RAW_RECEIPT="$(cast receipt "$TX_HASH" --rpc-url "$RPC_URL" --json)"
echo "$RAW_RECEIPT"
echo

LP_POOL_ADDR="$(jq -r '.contractAddress' <<<"$RAW_RECEIPT")"

if [[ -z "$LP_POOL_ADDR" || "$LP_POOL_ADDR" == "0x0000000000000000000000000000000000000000" ]]; then
  echo "[FATAL] bad LP pool address from receipt: '$LP_POOL_ADDR'" >&2
  exit 1
fi

echo "WorkCreditsDevnetPool (lpPool) = $LP_POOL_ADDR"
echo

echo "=== [5] update live config.lpPool ==="
TMP="$(mktemp)"
jq --arg addr "$LP_POOL_ADDR" '.lpPool = $addr' "$CFG" >"$TMP"
mv "$TMP" "$CFG"
echo "[ok] updated $CFG with lpPool = $LP_POOL_ADDR"
echo

# Seed amounts (devnet only): 1000 VOID, 100,000 WC
AMOUNT_VOID="1000000000000000000000"      # 1,000 * 1e18
AMOUNT_WC="100000000000000000000000"     # 100,000 * 1e18

echo "=== [6] approve + seed ==="
echo "AMOUNT_VOID = $AMOUNT_VOID"
echo "AMOUNT_WC   = $AMOUNT_WC"
echo

echo "--- approve VOID -> pool ---"
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_DEPLOYER_KEY" \
  "$VOID_TOKEN" "approve(address,uint256)" "$LP_POOL_ADDR" "$AMOUNT_VOID"

echo "--- approve WC -> pool ---"
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_DEPLOYER_KEY" \
  "$WC_TOKEN" "approve(address,uint256)" "$LP_POOL_ADDR" "$AMOUNT_WC"

echo "--- pool.seed(amountVOID,amountWC) ---"
cast send \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_DEPLOYER_KEY" \
  "$LP_POOL_ADDR" "seed(uint256,uint256)" "$AMOUNT_VOID" "$AMOUNT_WC"

echo
echo "=== [DONE] LP deployed + seeded ==="
echo "lpPool = $LP_POOL_ADDR"
