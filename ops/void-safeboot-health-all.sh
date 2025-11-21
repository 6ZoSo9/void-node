#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[safeboot-health] repo=$REPO"
echo "[safeboot-health] prom_url=$PROM_URL"

query_scalar() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get --data-urlencode "query=$q" \
  | jq -r 'if .data.result|length==0 then "null" else .data.result[0].value[1] end'
}

echo "[safeboot-health] checking safeboot Prometheus gauges..."

health_ok=$(query_scalar 'void:safeboot:health_ok')
head_ok=$(query_scalar 'void:safeboot:head_ok')
overall=$(query_scalar 'void:safeboot:overall')

echo "[safeboot-health] gauges:"
echo "  void:safeboot:health_ok = $health_ok"
echo "  void:safeboot:head_ok   = $head_ok"
echo "  void:safeboot:overall   = $overall"

fail=0

if [[ "$health_ok" == "null" ]]; then
  echo "[safeboot-health] NOTE: void:safeboot:health_ok missing; relying on overall only"
elif [[ "$health_ok" != "1" ]]; then
  echo "[safeboot-health] ERROR: void:safeboot:health_ok != 1"
  fail=1
fi

if [[ "$head_ok" == "null" ]]; then
  echo "[safeboot-health] NOTE: void:safeboot:head_ok missing; relying on overall only"
elif [[ "$head_ok" != "1" ]]; then
  echo "[safeboot-health] ERROR: void:safeboot:head_ok != 1"
  fail=1
fi

if [[ "$overall" != "1" ]]; then
  echo "[safeboot-health] ERROR: void:safeboot:overall != 1"
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[safeboot-health] RESULT: BAD (one or more safeboot gauges not equal to 1)"
  exit 1
fi

echo "[safeboot-health] RESULT: OK (safeboot overall==1; sub-gauges either ==1 or missing)"
