#!/usr/bin/env bash
set -euo pipefail

# Exporter for VOID mainnet bootstrap PLAN metrics into node_exporter textfile dir.
#
# Steps:
#   1) Run ops/void-mainnet-bootstrap-plan-health.sh (PLAN-only, no broadcast)
#   2) Copy ops/out/void-mainnet-bootstrap-plan.prom into TEXTFILE_DIR
#
# Env:
#   CONFIG_PATH   : bootstrap config (default: config/void-mainnet-bootstrap-mainnet.live.json)
#   RPC_URL       : RPC for simulation (default: http://127.0.0.1:8545)
#   OUT_DIR       : plan output dir (default: ops/out)
#   TEXTFILE_DIR  : node_exporter textfile dir
#                   (default: /var/lib/node_exporter/textfile)
#
# NOTE:
#   - This does NOT enforce PLAN_OK==1; it just exports whatever the plan file says.
#   - Right now PLAN_OK will be 0 because the script/config are intentionally a stub.

cd "$HOME/dev/void-node"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
OUT_DIR="${OUT_DIR:-ops/out}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile}"

PLAN_PROM="${OUT_DIR}/void-mainnet-bootstrap-plan.prom"
TEXTFILE_PROM="${TEXTFILE_DIR}/void_mainnet_bootstrap_plan.prom"

echo "=== [plan-exporter] VOID mainnet bootstrap PLAN → node_exporter textfile ==="
echo "[plan-exporter] CONFIG_PATH   = ${CONFIG_PATH}"
echo "[plan-exporter] RPC_URL       = ${RPC_URL}"
echo "[plan-exporter] OUT_DIR       = ${OUT_DIR}"
echo "[plan-exporter] PLAN_PROM     = ${PLAN_PROM}"
echo "[plan-exporter] TEXTFILE_DIR  = ${TEXTFILE_DIR}"
echo "[plan-exporter] TEXTFILE_PROM = ${TEXTFILE_PROM}"
echo

# --- [0] ensure textfile dir exists -----------------------------------------
if [ ! -d "${TEXTFILE_DIR}" ]; then
  echo "[plan-exporter] creating TEXTFILE_DIR: ${TEXTFILE_DIR}"
  sudo mkdir -p "${TEXTFILE_DIR}"
fi

# --- [1] run the plan-health wrapper (PLAN-only, no broadcast) --------------
CONFIG_PATH="${CONFIG_PATH}" RPC_URL="${RPC_URL}" OUT_DIR="${OUT_DIR}" \
  ./ops/void-mainnet-bootstrap-plan-health.sh

if [ ! -f "${PLAN_PROM}" ]; then
  echo "[plan-exporter] ERROR: plan .prom file not found: ${PLAN_PROM}" >&2
  exit 1
fi

# --- [2] copy into textfile dir with tmp→mv swap ----------------------------

TMP_DEST="${TEXTFILE_PROM}.tmp"

echo "[plan-exporter] copying ${PLAN_PROM} → ${TMP_DEST}"
sudo cp "${PLAN_PROM}" "${TMP_DEST}"

# best-effort chown; don't fail hard if user/group doesn't exist
if id node_exporter >/dev/null 2>&1; then
  echo "[plan-exporter] chown node_exporter:node_exporter ${TMP_DEST}"
  sudo chown node_exporter:node_exporter "${TMP_DEST}" || true
else
  echo "[plan-exporter] node_exporter user not found; skipping chown (non-fatal)"
fi

echo "[plan-exporter] moving ${TMP_DEST} → ${TEXTFILE_PROM}"
sudo mv "${TMP_DEST}" "${TEXTFILE_PROM}"

echo
echo "[plan-exporter] done. node_exporter should now expose void_mainnet_bootstrap_plan_* metrics."
