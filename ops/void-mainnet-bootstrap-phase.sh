#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

query_scalar() {
  local expr="$1"
  local val

  val=$(curl -fsS "${PROM_URL}/api/v1/query" \
        --get --data-urlencode "query=${expr}" \
        | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")

  echo "$val"
}

echo "=== [mainnet-bootstrap-phase] VOID mainnet bootstrap phase inspector ==="
echo "[cfg] PROM_URL = ${PROM_URL}"
echo

echo "=== [1] read core + PLAN gauges ==="

pillars=$(query_scalar 'void:mainnet_pillars:health:last_5m')
lastmile=$(query_scalar 'void:mainnet_lastmile:health:last_5m')
plan_configured=$(query_scalar 'void:mainnet_bootstrap_plan:configured:last_5m')
plan_health=$(query_scalar 'void:mainnet_bootstrap_plan:health:last_5m')

printf "  %-45s = %s\n" "void:mainnet_pillars:health:last_5m"           "${pillars}"
printf "  %-45s = %s\n" "void:mainnet_lastmile:health:last_5m"          "${lastmile}"
printf "  %-45s = %s\n" "void:mainnet_bootstrap_plan:configured:last_5m" "${plan_configured}"
printf "  %-45s = %s\n" "void:mainnet_bootstrap_plan:health:last_5m"     "${plan_health}"
echo

echo "=== [2] interpret phase ==="

phase="PRE"
reason="core pillars and/or lastmile not all healthy yet"

if [[ "${pillars}" == "1" && "${lastmile}" == "1" ]]; then
  if [[ "${plan_configured}" != "1" ]]; then
    phase="A"
    reason="PLAN not configured yet (plan_configured!=1)"
  else
    if [[ "${plan_health}" == "1" ]]; then
      phase="C"
      reason="PLAN configured and READY (plan_health==1)"
    else
      phase="B"
      reason="PLAN configured but NOT READY (plan_health!=1)"
    fi
  fi
fi

echo "  phase  : ${phase}"
echo "  reason : ${reason}"
echo
echo "=== [3] summary ==="
cat <<EOF
  - This script is read-only and only talks to Prometheus.
  - Phase labels are a human-friendly view over existing gauges:
      PRE: core not healthy (fix pillars/lastmile).
      A  : core healthy, PLAN not configured.
      B  : PLAN configured but NOT READY (roles/contracts/validator0 incomplete).
      C  : PLAN configured and READY (plan_health==1, safe to consider bootstrap).
  - Phase D (post-bootstrap DONE) will be wired later via a dedicated metric.
EOF

echo
echo "=== [mainnet-bootstrap-phase] DONE ==="
