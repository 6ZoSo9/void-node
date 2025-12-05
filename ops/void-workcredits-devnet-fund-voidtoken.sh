#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Devnet VoidToken on anvil-2050
DEVNET_VOID_TOKEN="0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"

echo "=== [wc-devnet-fund-voidtoken] repo ==="
pwd
echo
echo "=== [wc-devnet-fund-voidtoken] RPC_URL ==="
echo "RPC_URL=${RPC_URL}"
echo

KEY_FILE="${KEY_FILE:-$REPO_ROOT/.secrets/devnet-caller.key}"

echo "=== [wc-devnet-fund-voidtoken] loading devnet caller key ==="
if [ ! -f "${KEY_FILE}" ]; then
  echo "[FATAL] devnet caller key not found at ${KEY_FILE}"
  exit 1
fi

KEY_HEX="$(cat "${KEY_FILE}")"
CALLER_ADDR="$(cast wallet address --private-key "${KEY_HEX}")"

echo "CALLER_ADDR (from key) = ${CALLER_ADDR}"
echo

# Default: 1000 VOID (18 decimals)
FUND_VOID="${FUND_VOID:-1000000000000000000000}"

echo "=== [wc-devnet-fund-voidtoken] parameters ==="
echo "FUND_VOID (VOID, 18-dec) = ${FUND_VOID}"
echo "DRY_RUN                  = ${DRY_RUN:-0}"
echo

echo "=== [wc-devnet-fund-voidtoken] planned action ==="
echo "mint FUND_VOID to CALLER_ADDR via VoidToken.mint"
echo

if [ "${DRY_RUN:-0}" != "0" ]; then
  echo "[DRY_RUN] skipping on-chain send; showing command only:"
  cat <<EOF
cast send ${DEVNET_VOID_TOKEN} "mint(address,uint256)" \\
    ${CALLER_ADDR} ${FUND_VOID} \\
    --private-key <hidden> --rpc-url ${RPC_URL}
EOF
  exit 0
fi

echo "=== [wc-devnet-fund-voidtoken] ACTION: mint VOID to caller ==="
cast send "${DEVNET_VOID_TOKEN}" \
  "mint(address,uint256)" \
  "${CALLER_ADDR}" "${FUND_VOID}" \
  --private-key "${KEY_HEX}" \
  --rpc-url "${RPC_URL}"

echo
echo "=== [wc-devnet-fund-voidtoken] DONE ==="
echo "You can now inspect caller VOID balance with:"
echo "  cast call ${DEVNET_VOID_TOKEN} \"balanceOf(address)(uint256)\" ${CALLER_ADDR} --rpc-url ${RPC_URL}"
