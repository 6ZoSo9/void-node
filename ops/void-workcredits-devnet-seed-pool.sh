#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

# Devnet VoidToken on anvil-2050
DEVNET_VOID_TOKEN="0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"

echo "=== [wc-devnet-seed-pool] repo ==="
pwd
echo
echo "=== [wc-devnet-seed-pool] RPC_URL ==="
echo "RPC_URL=${RPC_URL}"
echo

if [ ! -f "${STATE_FILE}" ]; then
  echo "[FATAL] ${STATE_FILE} not found; run devnet bootstrap + WC deploy first."
  exit 1
fi

echo "=== [wc-devnet-seed-pool] reading WC + pool addresses from ${STATE_FILE} ==="
WC_TOKEN_ADDR="$(jq -r '.workCreditsToken // empty' "${STATE_FILE}")"
POOL_ADDR="$(jq -r '.workCreditsPoolV1 // empty' "${STATE_FILE}")"

if [ -z "${WC_TOKEN_ADDR}" ] || [ "${WC_TOKEN_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsToken missing in ${STATE_FILE}"
  exit 1
fi
if [ -z "${POOL_ADDR}" ] || [ "${POOL_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsPoolV1 missing in ${STATE_FILE}"
  exit 1
fi

echo "VoidToken          = ${DEVNET_VOID_TOKEN}"
echo "WorkCreditsToken   = ${WC_TOKEN_ADDR}"
echo "WorkCreditsPoolV1  = ${POOL_ADDR}"
echo

KEY_FILE="${KEY_FILE:-$REPO_ROOT/.secrets/devnet-caller.key}"

echo "=== [wc-devnet-seed-pool] loading devnet caller key ==="
if [ ! -f "${KEY_FILE}" ]; then
  echo "[FATAL] devnet caller key not found at ${KEY_FILE}"
  exit 1
fi

KEY_HEX="$(cat "${KEY_FILE}")"
CALLER_ADDR="$(cast wallet address --private-key "${KEY_HEX}")"

echo "CALLER_ADDR (from key) = ${CALLER_ADDR}"
echo

# Defaults: 100 VOID + 100 WC (18 decimals)
SEED_VOID="${SEED_VOID:-100000000000000000000}"
SEED_WC="${SEED_WC:-100000000000000000000}"

echo "=== [wc-devnet-seed-pool] parameters ==="
echo "SEED_VOID (VOID, 18-dec) = ${SEED_VOID}"
echo "SEED_WC   (WC,   18-dec) = ${SEED_WC}"
echo "DRY_RUN                  = ${DRY_RUN:-0}"
echo

echo "=== [wc-devnet-seed-pool] planned actions ==="
echo "1) transfer SEED_VOID from ${CALLER_ADDR} -> pool (${POOL_ADDR}) via VoidToken.transfer"
echo "2) transfer SEED_WC   from ${CALLER_ADDR} -> pool (${POOL_ADDR}) via WorkCreditsToken.transfer"
echo

if [ "${DRY_RUN:-0}" != "0" ]; then
  echo "[DRY_RUN] skipping on-chain sends; showing commands only:"
  cat <<EOF
cast send ${DEVNET_VOID_TOKEN} "transfer(address,uint256)" \\
    ${POOL_ADDR} ${SEED_VOID} \\
    --private-key <hidden> --rpc-url ${RPC_URL}

cast send ${WC_TOKEN_ADDR} "transfer(address,uint256)" \\
    ${POOL_ADDR} ${SEED_WC} \\
    --private-key <hidden> --rpc-url ${RPC_URL}
EOF
  exit 0
fi

echo "=== [wc-devnet-seed-pool] ACTION: seed VOID into pool ==="
cast send "${DEVNET_VOID_TOKEN}" \
  "transfer(address,uint256)" \
  "${POOL_ADDR}" "${SEED_VOID}" \
  --private-key "${KEY_HEX}" \
  --rpc-url "${RPC_URL}"

echo
echo "=== [wc-devnet-seed-pool] ACTION: seed WC into pool ==="
cast send "${WC_TOKEN_ADDR}" \
  "transfer(address,uint256)" \
  "${POOL_ADDR}" "${SEED_WC}" \
  --private-key "${KEY_HEX}" \
  --rpc-url "${RPC_URL}"

echo
echo "=== [wc-devnet-seed-pool] DONE ==="
echo "You can now inspect pool reserves with:"
echo "  ./ops/void-workcredits-devnet-pool-state.sh"
