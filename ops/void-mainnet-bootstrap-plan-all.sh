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
  echo "[plan-all] NOTE: plan-sim exited with rc=${SIM_RC}"
fi
echo

echo "=== [2] PLAN health-all (exporter + Prometheus) ==="
if ! ./ops/void-mainnet-bootstrap-plan-health-all.sh; then
  HEALTH_RC=$?
  echo "[plan-all] NOTE: plan-health-all exited with rc=${HEALTH_RC}"
fi
echo

echo "=== [3] PLAN status snapshot (raw gauges + 5m view) ==="
./ops/void-mainnet-bootstrap-plan-status.sh || echo "[plan-all] WARN: status hammer exited non-zero"
echo

echo "=== [4] summary ==="
echo "[plan-all] sim_rc    = ${SIM_RC}"
echo "[plan-all] health_rc = ${HEALTH_RC}"
echo

echo "=== [5] gating on void:mainnet_bootstrap_plan:health:last_5m ==="
PLAN_5M_RAW=$(
  curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_bootstrap_plan:health:last_5m" \
    | jq -r '.data.result[0].value[1] // "NaN"' \
  || echo "NaN"
)

PLAN_REASON=$(
  curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_bootstrap_plan_health_info" \
    | jq -r '.data.result[0].metric.reason // "unknown"' \
  || echo "unknown"
)

echo "[plan-all] plan_5m = ${PLAN_5M_RAW}"
echo "[plan-all] reason  = ${PLAN_REASON}"

if [[ "${PLAN_5M_RAW}" == "1" ]]; then
  echo "[plan-all] RESULT: OK (PLAN pillar GREEN — 5m health == 1)"
  exit 0
else
  echo "[plan-all] RESULT: NOT_OK (PLAN pillar NOT READY — this is expected until real mainnet roles/keys exist)"
  exit 1
fi
