#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"
DATANET_RECEIPTS_MAX_AGE_SECONDS="${DATANET_RECEIPTS_MAX_AGE_SECONDS:-300}"

q() {
  local expr="$1"
  local j
  j="$(curl -fsS --max-time 2 -G "$PROM/api/v1/query" --data-urlencode "query=$expr" || true)"
  if [ -z "$j" ]; then echo ""; return 0; fi

  echo "$j" | jq -r '
    if .status != "success" then empty
    elif .data.resultType == "scalar" then (.data.result[1] // empty)
    elif .data.resultType == "vector" then
      if (.data.result | length) == 0 then empty else (.data.result[0].value[1] // empty) end
    else empty
    end
  ' 2>/dev/null | sed -E 's/^null$//; s/^[[:space:]]+|[[:space:]]+$//g'
}

fresh_by_age() {
  awk -v present="${1:-0}" -v age="${2:-999999999}" -v max="$DATANET_RECEIPTS_MAX_AGE_SECONDS" 'BEGIN {
    if ((present + 0) >= 1 && (age + 0) >= 0 && (age + 0) <= max) print 1;
    else print 0;
  }'
}

bool_and() {
  awk -v a="${1:-0}" -v b="${2:-0}" 'BEGIN {
    if ((a + 0) == 1 && (b + 0) == 1) print 1;
    else print 0;
  }'
}

# Maintained live exporter names first.
smoke_fast_ok="$(q 'max(void_datanet_smoke_ok)')"
mvp_smoke_ok="$(q 'max(void_datanet_mvp_smoke_ok)')"
if [ -z "$mvp_smoke_ok" ]; then
  mvp_smoke_ok="$(q 'max(void_datanet_mvp_roundtrip_ok)')"
fi
if [ -z "$mvp_smoke_ok" ]; then
  # v7 smoke already covers publish -> fetch -> roundtrip.
  mvp_smoke_ok="$smoke_fast_ok"
fi

# Prefer new/recording names if present; fall back to maintained textfile metrics.
now="$(q 'max(void_datanet_overall_health_by_target)')"
if [ -z "$now" ]; then
  now="$(bool_and "${smoke_fast_ok:-0}" "${mvp_smoke_ok:-0}")"
fi

last5="$(q 'max(void_datanet_overall_health_by_target)')"
if [ -z "$last5" ]; then
  last5="$(q '(max(min_over_time(void_datanet_smoke_ok[5m])) > bool 0)')"
fi
if [ -z "$last5" ]; then
  last5="$now"
fi

receipts_age_now="$(q 'max(void_datanet_receipts_file_age_seconds)')"
if [ -z "$receipts_age_now" ]; then
  receipts_age_now="$(q 'max(void_datanet_receipts_age_seconds)')"
fi

receipts_file_present="$(q 'max(void_datanet_receipts_file_present)')"
receipts_file_present="${receipts_file_present:-0}"

receipts_ok_now="$(q 'max(void_datanet_receipts_file_status_ok)')"
if [ -z "$receipts_ok_now" ]; then
  receipts_ok_now="$(fresh_by_age "$receipts_file_present" "${receipts_age_now:-999999999}")"
fi

receipts_ok_last5="$(q 'max(void:datanet_receipts_file:pillar_ok:last_5m)')"
if [ -z "$receipts_ok_last5" ]; then
  receipts_ok_last5="$(q 'max(void_datanet_receipts_file_ok_last_5m)')"
fi
if [ -z "$receipts_ok_last5" ]; then
  receipts_ok_last5="$receipts_ok_now"
fi

comp="$(q 'max(void_datanet_overall_health_by_target) * max(void:datanet_receipts_file:pillar_ok:last_5m)')"
if [ -z "$comp" ]; then
  comp="$(bool_and "${now:-0}" "${receipts_ok_last5:-0}")"
fi

# Normalize empties.
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
