#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

SAFE_URL="http://127.0.0.1:4104"
PROM_URL="http://127.0.0.1:9090"

echo "[safeboot-health-all] step 0: basic service status..."
if systemctl --user is-active --quiet void-node@safe-4100.service; then
  echo "[safeboot-health-all] safeboot service: active"
else
  echo "[safeboot-health-all] safeboot service: NOT ACTIVE"
fi
echo

echo "[safeboot-health-all] step 1: safeboot-health-v2 script..."
SAFEBOOT_HEALTH_RC=0
./ops/void-safeboot-health-v2.sh || SAFEBOOT_HEALTH_RC=$?
echo "[safeboot-health-all] safeboot-health-v2 exit code: ${SAFEBOOT_HEALTH_RC}"
echo

echo "[safeboot-health-all] step 2: safeboot head compare vs main..."
SAFEBOOT_HEAD_RC=0
./ops/void-safeboot-head-compare.sh || SAFEBOOT_HEAD_RC=$?
echo "[safeboot-health-all] safeboot-head-compare exit code: ${SAFEBOOT_HEAD_RC}"
echo

echo "[safeboot-health-all] step 3: Prometheus void:safeboot:overall..."
OVERALL_RAW=$(curl -fsS "${PROM_URL}/api/v1/query?query=void:safeboot:overall" | jq -r '.data.result[0].value[1] // "null"' || echo "null")
echo "[safeboot-health-all] void:safeboot:overall = ${OVERALL_RAW}"
echo

RESULT="BAD"
if [[ "${SAFEBOOT_HEALTH_RC}" -eq 0 && "${SAFEBOOT_HEAD_RC}" -eq 0 && "${OVERALL_RAW}" == "1" ]]; then
  RESULT="OK"
fi

echo "[safeboot-health-all] RESULT: ${RESULT} (health-v2 rc=${SAFEBOOT_HEALTH_RC}, head-compare rc=${SAFEBOOT_HEAD_RC}, overall=${OVERALL_RAW})"
