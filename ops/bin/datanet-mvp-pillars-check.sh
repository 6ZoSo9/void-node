#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"

q() {
  local expr="$1"
  curl -fsS -G "$PROM/api/v1/query" --data-urlencode "query=$expr" \
  | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0"
}

# DataNet health (0/1)
now="$(q 'max(void_datanet_overall_health)')"
last5="$(q 'max(min_over_time(void_datanet_overall_health[5m]))')"

# NOTE: void_datanet_receipts_ok_now is actually an AGE metric (seconds since last ok receipt).
# Treat "ok" as age < 300s.
receipts_age_now="$(q 'max(void_datanet_receipts_ok_now)')"
receipts_ok_now="$(q 'max(void_datanet_receipts_ok_now < bool 300)')"
receipts_ok_last5="$(q '(max(min_over_time(void_datanet_receipts_ok_now[5m])) < bool 300)')"

comp="0"
if [[ "$last5" == "1" && "$receipts_ok_last5" == "1" ]]; then
  comp="1"
fi

echo "datanet_ok_now=$now"
echo "datanet_ok_last5m=$last5"
echo "datanet_composite_last5m=$comp"

# extra debug (harmless)
echo "datanet_receipts_age_now=$receipts_age_now"
echo "datanet_receipts_ok_now=$receipts_ok_now"
echo "datanet_receipts_ok_last5m=$receipts_ok_last5"

if [[ "$comp" != "1" ]]; then
  echo "[FAIL] datanet composite+receipts not OK"
  exit 1
fi

echo "[OK] datanet composite+receipts OK"
