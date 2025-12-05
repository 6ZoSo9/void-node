#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

echo "=== [wc-relayer-demo] repo ==="
pwd
echo

if [ ! -f "${STATE_FILE}" ]; then
  echo "[FATAL] ${STATE_FILE} not found; run void-workcredits-devnet-deploy first."
  exit 1
fi

echo "=== [wc-relayer-demo] reading relayer address from ${STATE_FILE} ==="
RELAYER_ADDR="$(jq -r '.workCreditsRelayerV1 // empty' "${STATE_FILE}")"
if [ -z "${RELAYER_ADDR}" ] || [ "${RELAYER_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsRelayerV1 missing in ${STATE_FILE}"
  exit 1
fi
echo "WorkCreditsRelayerV1 = ${RELAYER_ADDR}"
echo

CHAIN_ID="${CHAIN_ID:-2050}"

# Defaults are just toy values – override these with real wallet addresses
USER_ADDR="${USER_ADDR:-0x0000000000000000000000000000000000000004}"
TARGET_ADDR="${TARGET_ADDR:-0x0000000000000000000000000000000000000005}"

MAX_VOID_FEE="${MAX_VOID_FEE:-10000000000000000}" # 0.01 VOID if 18 decimals
GAS_LIMIT="${GAS_LIMIT:-500000}"
DEADLINE_SECONDS="${DEADLINE_SECONDS:-3600}"

echo "=== [wc-relayer-demo] parameters ==="
echo "CHAIN_ID         = ${CHAIN_ID}"
echo "RELAYER_ADDR     = ${RELAYER_ADDR}"
echo "USER_ADDR        = ${USER_ADDR}"
echo "TARGET_ADDR      = ${TARGET_ADDR}"
echo "MAX_VOID_FEE     = ${MAX_VOID_FEE}"
echo "GAS_LIMIT        = ${GAS_LIMIT}"
echo "DEADLINE_SECONDS = ${DEADLINE_SECONDS}"
echo

echo "=== [wc-relayer-demo] running TS EIP-712 demo ==="
CHAIN_ID="${CHAIN_ID}" \
RELAYER_ADDR="${RELAYER_ADDR}" \
USER_ADDR="${USER_ADDR}" \
TARGET_ADDR="${TARGET_ADDR}" \
MAX_VOID_FEE="${MAX_VOID_FEE}" \
GAS_LIMIT="${GAS_LIMIT}" \
DEADLINE_SECONDS="${DEADLINE_SECONDS}" \
npx tsx src/workcredits_relayer_sign_demo.ts

echo
echo "=== [wc-relayer-demo] done ==="
