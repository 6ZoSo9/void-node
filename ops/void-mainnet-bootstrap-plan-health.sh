#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap PLAN health wrapper
#
# - Runs ops/void-mainnet-bootstrap-plan.sh (PLAN-only, no broadcast)
# - Reads the generated .prom file
# - Prints a human-readable status
# - Optionally exits non-zero if PLAN_OK==0 (controlled by EXIT_ON_FAIL)
#
# Env:
#   CONFIG_PATH   : override config path (default: config/void-mainnet-bootstrap-mainnet.live.json)
#   RPC_URL       : override RPC (default: http://127.0.0.1:8545)
#   OUT_DIR       : override output dir (default: ops/out)
#   EXIT_ON_FAIL  : if "1", exit 1 when PLAN_OK == 0 (default: 0 -> never hard-fail)

cd "$HOME/dev/void-node"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
OUT_DIR="${OUT_DIR:-ops/out}"
PROM_FILE="${OUT_DIR}/void-mainnet-bootstrap-plan.prom"
EXIT_ON_FAIL="${EXIT_ON_FAIL:-0}"

echo "=== [plan-health] VOID mainnet bootstrap PLAN health ==="
echo "[plan-health] CONFIG_PATH  = ${CONFIG_PATH}"
echo "[plan-health] RPC_URL      = ${RPC_URL}"
echo "[plan-health] OUT_DIR      = ${OUT_DIR}"
echo "[plan-health] PROM_FILE    = ${PROM_FILE}"
echo "[plan-health] EXIT_ON_FAIL = ${EXIT_ON_FAIL}"
echo

# --- [0] run the underlying PLAN script (PLAN-only, no broadcast) -----------

if [ ! -x ops/void-mainnet-bootstrap-plan.sh ]; then
  echo "[plan-health] ERROR: ops/void-mainnet-bootstrap-plan.sh is missing or not executable." >&2
  exit 1
fi

CONFIG_PATH="${CONFIG_PATH}" RPC_URL="${RPC_URL}" OUT_DIR="${OUT_DIR}" \
  ./ops/void-mainnet-bootstrap-plan.sh

echo
echo "=== [plan-health] reading Prometheus plan file ==="

if [ ! -f "${PROM_FILE}" ]; then
  echo "[plan-health] ERROR: expected Prom file not found: ${PROM_FILE}" >&2
  if [ "${EXIT_ON_FAIL}" = "1" ]; then
    exit 1
  else
    exit 0
  fi
fi

PLAN_OK_RAW=$(grep '^void_mainnet_bootstrap_plan_ok' "${PROM_FILE}" | awk '{print $NF}' || echo "")
CHAIN_ID_RAW=$(grep '^void_mainnet_bootstrap_plan_chainid' "${PROM_FILE}" | awk '{print $NF}' || echo "")
VALIDATORS_RAW=$(grep '^void_mainnet_bootstrap_plan_validators' "${PROM_FILE}" | awk '{print $NF}' || echo "")
CONFIG_SHA_RAW=$(grep '^void_mainnet_bootstrap_plan_ok' "${PROM_FILE}" | sed -n 's/.*config_sha="\([^"]*\)".*/\1/p' | head -n1 || echo "")

PLAN_OK="${PLAN_OK_RAW:-0}"
CHAIN_ID="${CHAIN_ID_RAW:-0}"
VALIDATORS="${VALIDATORS_RAW:-0}"
CONFIG_SHA="${CONFIG_SHA_RAW:-unknown}"

echo "[plan-health] PLAN_OK     = ${PLAN_OK}"
echo "[plan-health] CHAIN_ID    = ${CHAIN_ID}"
echo "[plan-health] VALIDATORS  = ${VALIDATORS}"
echo "[plan-health] CONFIG_SHA  = ${CONFIG_SHA}"
echo

# --- [1] human-readable verdict --------------------------------------------

if [ "${PLAN_OK}" = "1" ]; then
  echo "[plan-health] RESULT: OK (bootstrap PLAN is ready: PLAN_OK==1)"
  echo "[plan-health]         You can now consider wiring this into pillars/pre-push as a hard gate."
  EXIT_CODE=0
else
  echo "[plan-health] RESULT: NOT READY (PLAN_OK==0)"
  echo "[plan-health]         This is expected while the mainnet bootstrap script/config are still a stub."
  echo "[plan-health]         Once you wire real addresses + tokenomics + validator stakes and"
  echo "[plan-health]         remove the stub revert, this should flip to PLAN_OK==1."
  EXIT_CODE=1
fi

if [ "${EXIT_ON_FAIL}" = "1" ]; then
  exit "${EXIT_CODE}"
else
  # Informational mode: never hard-fail by default.
  exit 0
fi
