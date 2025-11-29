#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

cd "${REPO_ROOT}"

echo "=== [mainnet-bootstrap-plan-rehearse] VOID mainnet PLAN rehearsal ==="
echo "[cfg] REPO_ROOT   = ${REPO_ROOT}"
echo "[cfg] RPC_URL     = ${RPC_URL}"
echo "[cfg] CONFIG_PATH = ${CONFIG_PATH}"

echo
echo "=== [0] chainId sanity ==="
CHAIN_ID_RPC="$(cast chain-id "${RPC_URL}" 2>/dev/null || echo "ERR")"
CHAIN_ID_CFG="$(jq -r '.chainId' "${CONFIG_PATH}" 2>/dev/null || echo "ERR")"

echo "  chainId (config) : ${CHAIN_ID_CFG}"
echo "  chainId (RPC)    : ${CHAIN_ID_RPC}"

if [[ "${CHAIN_ID_RPC}" == "ERR" ]]; then
  echo "  -> WARNING: could not query chainId from RPC; continuing, but this should be 2050."
elif [[ "${CHAIN_ID_CFG}" == "ERR" ]]; then
  echo "  -> WARNING: could not read chainId from config JSON."
elif [[ "${CHAIN_ID_RPC}" != "${CHAIN_ID_CFG}" ]]; then
  echo "  -> WARNING: chainId mismatch between config and RPC."
else
  echo "  -> chainId sanity: OK"
fi

echo
echo "=== [1] running Forge PLAN rehearsal (NO BROADCAST) ==="

forge script \
  script/VoidMainnetBootstrapPlanRehearse.s.sol:VoidMainnetBootstrapPlanRehearse \
  --sig "run(string)" "${CONFIG_PATH}" \
  --rpc-url "${RPC_URL}"

echo
echo "=== [mainnet-bootstrap-plan-rehearse] DONE (no txs sent) ==="
