#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

echo "=== [wc-devnet-fund-and-mint] repo ==="
pwd
echo
echo "=== [wc-devnet-fund-and-mint] RPC_URL ==="
echo "RPC_URL=${RPC_URL}"
echo

if [ ! -f "${STATE_FILE}" ]; then
  echo "[FATAL] ${STATE_FILE} not found; run void-workcredits-devnet-deploy first."
  exit 1
fi

echo "=== [wc-devnet-fund-and-mint] reading WC addresses from ${STATE_FILE} ==="
WC_TOKEN_ADDR="$(jq -r '.workCreditsToken // empty' "${STATE_FILE}")"

if [ -z "${WC_TOKEN_ADDR}" ] || [ "${WC_TOKEN_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsToken missing in ${STATE_FILE}"
  exit 1
fi

echo "WorkCreditsToken = ${WC_TOKEN_ADDR}"
echo

echo "=== [wc-devnet-fund-and-mint] loading devnet caller key ==="
KEY_FILE="${DEVNET_CALLER_KEY_PATH:-${REPO_ROOT}/.secrets/devnet-caller.key}"
if [ ! -f "${KEY_FILE}" ]; then
  echo "[FATAL] devnet caller key file not found: ${KEY_FILE}"
  echo "  Override with DEVNET_CALLER_KEY_PATH=/path/to/key if needed."
  exit 1
fi

DEVNET_CALLER_KEY="$(tr -d ' \n\r' < "${KEY_FILE}")"
if [ -z "${DEVNET_CALLER_KEY}" ]; then
  echo "[FATAL] DEVNET_CALLER_KEY is empty (file: ${KEY_FILE})"
  exit 1
fi

echo "[ok] using devnet caller key from: ${KEY_FILE}"
echo

echo "=== [wc-devnet-fund-and-mint] deriving caller address via cast ==="
if ! command -v cast >/dev/null 2>&1; then
  echo "[FATAL] foundry 'cast' not in PATH; ensure foundry is installed."
  exit 1
fi

CALLER_ADDR="$(cast wallet address --private-key "${DEVNET_CALLER_KEY}")"
echo "CALLER_ADDR (from key) = ${CALLER_ADDR}"
echo

# User that will receive WC. Default to caller address; override via USER_ADDR.
USER_ADDR="${USER_ADDR:-${CALLER_ADDR}}"

# Amount of WC to mint (18 decimals). Default: 1,000 WC.
MINT_AMOUNT_DEFAULT="1000000000000000000000"  # 1000 * 1e18
MINT_AMOUNT="${MINT_AMOUNT:-${MINT_AMOUNT_DEFAULT}}"

# Function signature for mint on WorkCreditsToken.
# Adjust via WC_MINT_FN_SIG if your function name differs.
WC_MINT_FN_SIG="${WC_MINT_FN_SIG:-mint(address,uint256)}"

echo "=== [wc-devnet-fund-and-mint] parameters ==="
echo "USER_ADDR        = ${USER_ADDR}"
echo "MINT_AMOUNT      = ${MINT_AMOUNT}  (18-decimal WC units)"
echo "WC_MINT_FN_SIG   = ${WC_MINT_FN_SIG}"
echo

echo "=== [wc-devnet-fund-and-mint] ACTION: mint WC to user ==="
echo "About to run:"
echo "  cast send ${WC_TOKEN_ADDR} \"${WC_MINT_FN_SIG}\" \\"
echo "      ${USER_ADDR} ${MINT_AMOUNT} \\"
echo "      --private-key <hidden> --rpc-url ${RPC_URL}"
echo

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "[info] DRY_RUN=1 set; not sending transaction."
  exit 0
fi

cast send "${WC_TOKEN_ADDR}" "${WC_MINT_FN_SIG}" \
  "${USER_ADDR}" "${MINT_AMOUNT}" \
  --private-key "${DEVNET_CALLER_KEY}" \
  --rpc-url "${RPC_URL}"

echo
echo "=== [wc-devnet-fund-and-mint] DONE ==="
echo "You can now inspect WC balance with e.g.:"
echo "  cast call ${WC_TOKEN_ADDR} \"balanceOf(address)(uint256)\" ${USER_ADDR} --rpc-url ${RPC_URL}"
