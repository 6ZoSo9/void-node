#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

query() {
  local expr="$1"
  curl -G -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
    | jq -r '.data.result[0].value[1] // "NaN"'
}

health="$(query 'void:devnet_jobs_status_v1:health')"
bad_flags="$(query 'void:devnet_jobs_status_v1:bad_flags')"
total="$(query 'void:devnet_jobs_status_v1:total')"

echo "[jobs-status-v1] repo      = ${REPO}"
echo "[jobs-status-v1] prom_url  = ${PROM_URL}"
echo
echo "[jobs-status-v1] health    = ${health}   (1 = spool/chain counts agree)"
echo "[jobs-status-v1] total     = ${total}    (jobs tracked by v1 exporter)"
echo "[jobs-status-v1] bad_flags = ${bad_flags} (jobs with inconsistent flags)"
echo

if [[ "${health}" != "1" ]]; then
  echo "[jobs-status-v1] WARNING: health != 1 (spool and chain counts diverge)."
fi

if [[ "${bad_flags}" != "0" ]]; then
  echo "[jobs-status-v1] NOTE: bad_flags > 0 (historic JobQueue flag inconsistency)."
  echo "[jobs-status-v1]       Coverage v2 gauges remain the source of truth for devnet health."
fi
