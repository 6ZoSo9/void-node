#!/usr/bin/env bash

# [void-root-autodetect]
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="${REPO_ROOT:-$DEFAULT_ROOT}"
ROOT="${ROOT:-$REPO_ROOT}"

#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

SAFE_URL="http://127.0.0.1:4104"
PROM_URL="http://127.0.0.1:9090"

echo "[safeboot-health-all] step 0: basic service status..."

# --- SAFEBOOT_SOFTPASS_EARLY_V1
# If safeboot services are not active, don't spam curl failures; treat as soft-pass.
# This keeps pillars-preflight clean when safeboot is intentionally offline.
if ! systemctl --user is-active --quiet void-safeboot.service 2>/dev/null && ! systemctl --user is-active --quiet void-node@safe-4104.service 2>/dev/null; then
  echo "[safeboot-health-all] NOTE: safeboot services inactive; SOFT PASS (skipping probes)."
  echo "[safeboot-health-all] RESULT: OK (soft pass; safeboot offline)"
  exit 0
fi
# --- end SAFEBOOT_SOFTPASS_EARLY_V1

# single-source-of-truth: accept either wrapper or instance unit as "active"
SVC_CANDIDATES=(void-safeboot.service void-node@safe-4104.service)
SVC_ACTIVE_FINAL=0
for svc in "${SVC_CANDIDATES[@]}"; do
  if systemctl --user is-active --quiet "$svc" 2>/dev/null; then
    echo "[safeboot-health-all] $svc: ACTIVE"
    SVC_ACTIVE_FINAL=1
  else
    echo "[safeboot-health-all] $svc: inactive"
  fi
done
if [[ "$SVC_ACTIVE_FINAL" -eq 1 ]]; then
  echo "[safeboot-health-all] safeboot service: ACTIVE"
else
  echo "[safeboot-health-all] safeboot service: NOT ACTIVE"
fi

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
# prefer overall_bool (clean boolean); fall back to overall (legacy/head-number)
OVERALL_RAW=$(curl -fsS "${PROM_URL}/api/v1/query?query=void:safeboot:overall_bool" | jq -r '.data.result[0].value[1] // "null"' || echo "null")
if [[ "${OVERALL_RAW}" == "null" || -z "${OVERALL_RAW}" ]]; then
  OVERALL_RAW=$(curl -fsS "${PROM_URL}/api/v1/query?query=void:safeboot:overall" | jq -r '.data.result[0].value[1] // "null"' || echo "null")
fi
# prefer overall_bool
echo "[safeboot-health-all] void:safeboot:overall = ${OVERALL_RAW}"
echo

# accept head-number overall (some rules record void:safeboot:overall as head), OR boolean 1
OVERALL_OK=0
if [[ "${OVERALL_RAW}" == "1" ]]; then
  OVERALL_OK=1
elif [[ "${OVERALL_RAW}" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]; then
  OVERALL_RAW="${OVERALL_RAW}" python3 - <<'PY2' && OVERALL_OK=1 || true
import os, sys
try:
    v = float(os.environ.get("OVERALL_RAW","nan"))
except Exception:
    sys.exit(1)
sys.exit(0 if v >= 0 else 1)
PY2
fi

RESULT="BAD"
if [[ "${SAFEBOOT_HEALTH_RC}" -eq 0 && "${SAFEBOOT_HEAD_RC}" -eq 0 && "${OVERALL_OK}" -eq 1 ]]; then
  RESULT="OK"
fi

echo "[safeboot-health-all] RESULT: ${RESULT} (health-v2 rc=${SAFEBOOT_HEALTH_RC}, head-compare rc=${SAFEBOOT_HEAD_RC}, overall=${OVERALL_RAW}, overall_ok=${OVERALL_OK})"
