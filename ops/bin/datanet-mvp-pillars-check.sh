#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"

q() {
  local expr="$1"
  local j
  j="$(curl -fsS --max-time 2 -G "$PROM/api/v1/query" --data-urlencode "query=$expr" || true)"
  if [ -z "$j" ]; then echo "0"; return 0; fi

  # Prometheus can return resultType: "vector" or "scalar"
  # - vector: .data.result[0].value[1]
  # - scalar: .data.result[1]
  echo "$j" | jq -r '
    if .status != "success" then "0"
    elif .data.resultType == "scalar" then (.data.result[1] // "0")
    elif .data.resultType == "vector" then
      if (.data.result | length) == 0 then "0" else (.data.result[0].value[1] // "0") end
    else "0"
    end
  ' 2>/dev/null | sed -E 's/^null$/0/; s/^[[:space:]]+|[[:space:]]+$//g'
}

# raw smoke metrics (current live names)
smoke_fast_ok="$(q 'max(void_datanet_smoke_ok)')"
mvp_smoke_ok="$(q 'max(void_datanet_mvp_smoke_ok)')"

# prefer current live series first
now="$(q 'max(void_datanet_overall_health_by_target)')"
last5="$(q 'max(void_datanet_overall_health_by_target)')"
receipts_age_now="$(q 'max(void_datanet_receipts_file_age_seconds)')"
receipts_ok_now="$(q 'max(void_datanet_receipts_file_status_ok)')"
receipts_ok_last5="$(q 'max(void:datanet_receipts_file:pillar_ok:last_5m)')"
comp=""

# fallbacks for older recording names if they still exist
if [ -z "${now}" ]; then
  now="$(q 'datanet_ok_now')"
fi
if [ -z "${last5}" ]; then
  last5="$(q 'datanet_ok_last5m')"
fi
if [ -z "${receipts_age_now}" ]; then
  receipts_age_now="$(q 'datanet_receipts_age_now')"
fi
if [ -z "${receipts_ok_now}" ]; then
  receipts_ok_now="$(q 'datanet_receipts_ok_now')"
fi
if [ -z "${receipts_ok_last5}" ]; then
  receipts_ok_last5="$(q 'max(void_datanet_receipts_file_ok_last_5m)')"
fi
if [ -z "${receipts_ok_last5}" ]; then
  receipts_ok_last5="$(q 'datanet_receipts_ok_last5m')"
fi

# raw fallbacks only if recordings are missing (empty), not when they are legitimately 0
if [ -z "${now}" ]; then
  now="$(q 'max(void_datanet_smoke_ok) * max(void_datanet_mvp_smoke_ok)')"
fi
if [ -z "${last5}" ]; then
  last5="$(q '(max(min_over_time(void_datanet_smoke_ok[5m])) > bool 0) * (max(min_over_time(void_datanet_mvp_smoke_ok[5m])) > bool 0)')"
fi
if [ -z "${receipts_ok_now}" ]; then
  receipts_ok_now="$(q 'max(void_datanet_receipts_file_status_ok)')"
fi
if [ -z "${receipts_ok_last5}" ]; then
  receipts_ok_last5="$(q 'max(void_datanet_receipts_file_ok_last_5m)')"
fi

# Canonical composite for this check: live datanet health * receipts-file pillar health.
# Do not trust old datanet_composite_last5m if it exists; compute from maintained inputs.
comp="$(q 'max(void_datanet_overall_health_by_target) * max(void:datanet_receipts_file:pillar_ok:last_5m)')"
if [ -z "${comp}" ]; then
  comp="$(q '('"${last5:-0}"' * '"${receipts_ok_last5:-0}"')')"
fi

# normalize empties -> 0
smoke_fast_ok="${smoke_fast_ok:-0}"
mvp_smoke_ok="${mvp_smoke_ok:-0}"
now="${now:-0}"
last5="${last5:-0}"
comp="${comp:-0}"
receipts_age_now="${receipts_age_now:-0}"
receipts_ok_now="${receipts_ok_now:-0}"
receipts_ok_last5="${receipts_ok_last5:-0}"

echo "datanet_ok_now=$now"
echo "datanet_ok_last5m=$last5"
echo "datanet_composite_last5m=$comp"
echo "datanet_receipts_age_now=$receipts_age_now"
echo "datanet_receipts_ok_now=$receipts_ok_now"
echo "datanet_receipts_ok_last5m=$receipts_ok_last5"

if [ "$comp" != "1" ]; then
  echo "[FAIL] datanet composite+receipts not OK"
  exit 1
fi
