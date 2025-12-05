#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

echo "=== [wc-devnet-smoke] repo ==="
pwd
echo
echo "=== [wc-devnet-smoke] RPC_URL ==="
echo "RPC_URL=${RPC_URL}"

if [ ! -f "${STATE_FILE}" ]; then
  echo "[FATAL] ${STATE_FILE} not found; run void-workcredits-devnet-deploy first."
  exit 1
fi

echo
echo "=== [wc-devnet-smoke] reading WC addresses from ${STATE_FILE} ==="
WC_TOKEN_ADDR="$(jq -r '.workCreditsToken // empty' "${STATE_FILE}")"
WC_POOL_ADDR="$(jq -r '.workCreditsPoolV1 // empty' "${STATE_FILE}")"
WC_RELAYER_ADDR="$(jq -r '.workCreditsRelayerV1 // empty' "${STATE_FILE}")"

if [ -z "${WC_TOKEN_ADDR}" ] || [ "${WC_TOKEN_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsToken missing in ${STATE_FILE}"
  exit 1
fi
if [ -z "${WC_POOL_ADDR}" ] || [ "${WC_POOL_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsPoolV1 missing in ${STATE_FILE}"
  exit 1
fi
if [ -z "${WC_RELAYER_ADDR}" ] || [ "${WC_RELAYER_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsRelayerV1 missing in ${STATE_FILE}"
  exit 1
fi

echo "WorkCreditsToken      = ${WC_TOKEN_ADDR}"
echo "WorkCreditsPoolV1     = ${WC_POOL_ADDR}"
echo "WorkCreditsRelayerV1  = ${WC_RELAYER_ADDR}"

echo
echo "=== [wc-devnet-smoke] WorkCreditsToken metadata ==="
cast call "${WC_TOKEN_ADDR}" "name()(string)" --rpc-url "${RPC_URL}"
cast call "${WC_TOKEN_ADDR}" "symbol()(string)" --rpc-url "${RPC_URL}"
cast call "${WC_TOKEN_ADDR}" "decimals()(uint8)" --rpc-url "${RPC_URL}"
cast call "${WC_TOKEN_ADDR}" "controller()(address)" --rpc-url "${RPC_URL}"

echo
echo "=== [wc-devnet-smoke] WorkCreditsPoolV1 wiring ==="
cast call "${WC_POOL_ADDR}" "voidToken()(address)" --rpc-url "${RPC_URL}"
cast call "${WC_POOL_ADDR}" "workCredits()(address)" --rpc-url "${RPC_URL}"

echo
echo "=== [wc-devnet-smoke] WorkCreditsPoolV1 reserves (if any) ==="
# These will be zero until we seed the pool.
cast call "${WC_POOL_ADDR}" "reserveVoid()(uint256)" --rpc-url "${RPC_URL}" || echo "[info] reserveVoid() call failed (check ABI)"
cast call "${WC_POOL_ADDR}" "reserveWC()(uint256)" --rpc-url "${RPC_URL}" || echo "[info] reserveWC() call failed (check ABI)"

echo
echo "=== [wc-devnet-smoke] WorkCreditsRelayerV1 wiring ==="
cast call "${WC_RELAYER_ADDR}" "pool()(address)" --rpc-url "${RPC_URL}" || echo "[info] pool() call failed (check ABI)"

echo
echo "=== [wc-devnet-smoke] RESULT: basic WC devnet wiring looks sane (if no errors above) ==="
