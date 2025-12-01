#!/usr/bin/env bash
set -euo pipefail

# Exporter: writes a textfile metric void_mainnet_bootstrap_plan_health
# based on the exit status of the PLAN-only script.
#
#  - 1 == PLAN OK (chainId match + invariants + no prefilled contracts)
#  - 0 == PLAN bad (PLAN script failed for any reason)

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
LIVE_CFG="${LIVE_CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${TEXTFILE_DIR}/void_mainnet_bootstrap_plan.prom"
TMP="$(mktemp)"

METRIC="void_mainnet_bootstrap_plan_health"

echo "=== [plan-health-exporter] VOID mainnet PLAN health ==="
echo "[cfg] REPO_ROOT = $(pwd)"
echo "[cfg] RPC_URL   = ${RPC_URL}"
echo "[cfg] LIVE_CFG  = ${LIVE_CFG}"
echo "[cfg] OUT       = ${OUT}"

HEALTH=0

# Run PLAN-only script; any failure means HEALTH=0.
if ./ops/void-mainnet-bootstrap-mainnet-plan-from-live.sh > /tmp/void-mainnet-plan-health.log 2>&1; then
  echo "[plan] PLAN script succeeded; marking health=1"
  HEALTH=1
else
  echo "[plan] PLAN script FAILED; marking health=0"
  HEALTH=0
fi

mkdir -p "${TEXTFILE_DIR}"

cat > "${TMP}" <<EOF
# HELP ${METRIC} VOID mainnet bootstrap PLAN health (1 ok, 0 bad)
# TYPE ${METRIC} gauge
${METRIC} ${HEALTH}
EOF

mv "${TMP}" "${OUT}"

echo "[plan-health-exporter] wrote ${OUT} with ${METRIC}=${HEALTH}"
echo "[plan-health-exporter] done."
