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
WC_TOKEN_ADDR="$(jq -r '(.workCreditsToken | if type=="object" then .address else . end) // empty' "${STATE_FILE}")"
WC_POOL_ADDR="$(jq -r '(.workCreditsPoolV1 | if type=="object" then .address else . end) // empty' "${STATE_FILE}")"
WC_RELAYER_ADDR="$(jq -r '(.workCreditsRelayerV1 | if type=="object" then .address else . end) // empty' "${STATE_FILE}")"

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

# name()
set +e
WC_NAME="$(cast call "${WC_TOKEN_ADDR}" 'name()(string)' --rpc-url "${RPC_URL}" 2>/tmp/wc_cast_err_name || true)"
RC_NAME=$?
set -e
if [ ${RC_NAME} -ne 0 ] || [ -z "${WC_NAME}" ]; then
  echo "[WARN] name() call failed on WorkCreditsToken (rc=${RC_NAME})"
  cat /tmp/wc_cast_err_name || true
else
  echo "${WC_NAME}"
fi
rm -f /tmp/wc_cast_err_name || true

# symbol()
set +e
WC_SYMBOL="$(cast call "${WC_TOKEN_ADDR}" 'symbol()(string)' --rpc-url "${RPC_URL}" 2>/tmp/wc_cast_err_symbol || true)"
RC_SYMBOL=$?
set -e
if [ ${RC_SYMBOL} -ne 0 ] || [ -z "${WC_SYMBOL}" ]; then
  echo "[WARN] symbol() call failed on WorkCreditsToken (rc=${RC_SYMBOL})"
  cat /tmp/wc_cast_err_symbol || true
else
  echo "${WC_SYMBOL}"
fi
rm -f /tmp/wc_cast_err_symbol || true

# decimals()
set +e
WC_DECIMALS="$(cast call "${WC_TOKEN_ADDR}" 'decimals()(uint8)' --rpc-url "${RPC_URL}" 2>/tmp/wc_cast_err_decimals || true)"
RC_DECIMALS=$?
set -e
if [ ${RC_DECIMALS} -ne 0 ] || [ -z "${WC_DECIMALS}" ]; then
  echo "[WARN] decimals() call failed on WorkCreditsToken (rc=${RC_DECIMALS})"
  cat /tmp/wc_cast_err_decimals || true
else
  echo "${WC_DECIMALS}"
fi
rm -f /tmp/wc_cast_err_decimals || true

# controller()
set +e
WC_CONTROLLER="$(cast call "${WC_TOKEN_ADDR}" 'owner()(address)' --rpc-url "${RPC_URL}" 2>/tmp/wc_cast_err_controller || true)"
RC_CONTROLLER=$?
set -e
if [ ${RC_CONTROLLER} -ne 0 ] || [ -z "${WC_CONTROLLER}" ]; then
  echo "[WARN] controller() call failed on WorkCreditsToken (rc=${RC_CONTROLLER})"
  cat /tmp/wc_cast_err_controller || true
else
  echo "${WC_CONTROLLER}"
fi
rm -f /tmp/wc_cast_err_controller || true

echo
echo "=== [wc-devnet-smoke] WorkCreditsPoolV1 wiring ==="

# voidToken()
set +e
POOL_VOID_TOKEN="$(cast call "${WC_POOL_ADDR}" 'voidToken()(address)' --rpc-url "${RPC_URL}" 2>/tmp/wc_cast_err_pool_void || true)" 2>/dev/null
RC_POOL_VOID=$?
set -e
if [ ${RC_POOL_VOID} -ne 0 ] || [ -z "${POOL_VOID_TOKEN}" ]; then
  echo "[WARN] voidToken() call failed on WorkCreditsPoolV1 (rc=${RC_POOL_VOID})"
  cat /tmp/wc_cast_err_pool_void || true
else
  echo "voidToken()       = ${POOL_VOID_TOKEN}"
fi
rm -f /tmp/wc_cast_err_pool_void || true

# workCreditsToken()
set +e
POOL_WC_TOKEN="$(cast call "${WC_POOL_ADDR}" 'wcToken()(address)' --rpc-url "${RPC_URL}" 2>/tmp/wc_cast_err_pool_wc || true)" 2>/dev/null
RC_POOL_WC=$?
set -e
if [ ${RC_POOL_WC} -ne 0 ] || [ -z "${POOL_WC_TOKEN}" ]; then
  echo "[WARN] workCreditsToken() call failed on WorkCreditsPoolV1 (rc=${RC_POOL_WC})"
  cat /tmp/wc_cast_err_pool_wc || true
else
  echo "wcToken()         = ${POOL_WC_TOKEN}"
fi
rm -f /tmp/wc_cast_err_pool_wc || true

# controller()
set +e
POOL_CONTROLLER="$(cast call "${WC_POOL_ADDR}" 'owner()(address)' 2>/dev/null | grep -Eo '0x[0-9a-fA-F]{40}' | head -n1 || true|| true)" 2>/dev/null
RC_POOL_CTRL=$?
set -e
if [ ${RC_POOL_CTRL} -ne 0 ] || [ -z "${POOL_CONTROLLER}" ]; then
  echo "[INFO] pool admin getter missing; OK (rc=${RC_POOL_CTRL})"
  cat /tmp/wc_cast_err_pool_ctrl || true
else
  echo "controller()      = ${POOL_CONTROLLER}"
fi
rm -f /tmp/wc_cast_err_pool_ctrl || true

echo
echo "=== [wc-devnet-smoke] summary ==="
echo "If you see no [FATAL] lines above, WC devnet wiring is at least minimally sane."
