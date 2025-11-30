#!/usr/bin/env bash
set -euo pipefail

echo "[plan-all] repo=${PWD}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
echo "[plan-all] prom_url=${PROM_URL}"
echo

SIM_RC=0
HEALTH_RC=0

echo "=== [1] PLAN sim invariants ==="
if ! ./ops/void-mainnet-bootstrap-plan-sim.sh; then
  SIM_RC=$?
  echo "[plan-all] NOTE: plan-sim exited with rc=${SIM_RC} (expected until real mainnet roles are wired)"
fi
echo

echo "=== [2] PLAN health-all (exporter + Prometheus) ==="
if ! ./ops/void-mainnet-bootstrap-plan-health-all.sh; then
  HEALTH_RC=$?
  echo "[plan-all] NOTE: plan-health-all exited with rc=${HEALTH_RC} (PLAN pillar not green yet)"
fi
echo

echo "=== [3] PLAN status snapshot (raw gauges + 5m view) ==="
./ops/void-mainnet-bootstrap-plan-status.sh || echo "[plan-all] WARN: status hammer exited non-zero"
echo

echo "=== [4] summary ==="
echo "[plan-all] sim_rc    = ${SIM_RC}"
echo "[plan-all] health_rc = ${HEALTH_RC}"

if [[ "${SIM_RC}" -eq 0 && "${HEALTH_RC}" -eq 0 ]]; then
  echo "[plan-all] RESULT: OK (PLAN pillar GREEN — sim invariants + health-all both passed)"
  exit 0
else
  echo "[plan-all] RESULT: NOT_OK (PLAN pillar NOT READY — this is expected until real mainnet roles/keys exist)"
  exit 1
fi
