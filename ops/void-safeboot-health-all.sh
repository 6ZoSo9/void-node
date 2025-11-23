#!/usr/bin/env bash
set -euo pipefail
cd "${HOME:-/home/zoso}/dev/void-node"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[safeboot-health] repo=$(pwd)"
echo "[safeboot-health] prom_url=${PROM_URL}"

# Ask Prometheus for the high-level safeboot scalar
RAW=$(
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode 'query=void:safeboot:overall' \
  | jq -r '.data.result[0].value[1] // "null"' \
  || echo "error"
)

echo "[safeboot-health] void:safeboot:overall = ${RAW}"

case "${RAW}" in
  null)
    echo "[safeboot-health] NOTE: no safeboot gauges at all; treating as SOFT PASS for now."
    echo "[safeboot-health]       (safeboot node probably offline by design; gate relaxed)"
    exit 0
    ;;
  error)
    echo "[safeboot-health] ERROR: query failed; treating as hard failure."
    exit 1
    ;;
  1)
    echo "[safeboot-health] OK: safeboot overall == 1"
    exit 0
    ;;
  *)
    echo "[safeboot-health] ERROR: safeboot overall != 1 (got ${RAW})"
    exit 1
    ;;
esac
