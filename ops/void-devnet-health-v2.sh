#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local label="$1"
  local expr="$2"

  echo ">>> ${label}"
  curl -fsS "${PROM_URL}/api/v1/query?query=${expr}" \
    | jq -r '.data.result[]? | "\(.metric) => \(.value[1])"' || echo "  (no series)"
  echo
}

echo "[devnet-v2-health] PROM_URL=${PROM_URL}"
echo

q "void:devnet_overall:max_5m"          'void:devnet_overall:max_5m'
q "void:devnet_coverage:last_5m"        'void:devnet_coverage:last_5m'
q "void:agent_receipts_coverage:last_5m" 'void:agent_receipts_coverage:last_5m'
q "void:devnet_coverage_ok:last_5m"     'void:devnet_coverage_ok:last_5m'
q "void:agent_receipts_coverage_ok:last_5m" 'void:agent_receipts_coverage_ok:last_5m'
q "void:devnet_overall_with_jobs_v2:health:last_5m" 'void:devnet_overall_with_jobs_v2:health:last_5m'

echo "[devnet-v2-health] RESULT:"
curl -fsS "${PROM_URL}/api/v1/query?query=void:devnet_overall_with_jobs_v2:health:last_5m" \
  | jq -r '.data.result[0].value[1] // "null"' \
  | awk '{ if ($1 == "1") print "  OK (v2==1)"; else print "  BAD (v2!=1: " $1 ")"; }'
