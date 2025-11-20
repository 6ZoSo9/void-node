#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local label="$1"
  local expr="$2"
  echo "--- $label ---"
  curl -fsS "$PROM/api/v1/query" \
    --data-urlencode "query=$expr" \
  | jq -r '.data.result[]? | "\(.metric) -> \(.value)"' || echo "[no series]"
  echo
}

echo "=== [VOID devnet summary] ==="
q "devnet overall health" 'void_devnet_overall_health'
q "devnet contracts health" 'void_devnet_contracts_healthy'

echo "=== [coverage] ==="
q "coverage + health" '{__name__=~"void_devnet_coverage(_health)?$"}'

echo "=== [jobs] ==="
q "jobs totals" '{__name__=~"void_devnet_jobs_(total|total_v2|with_result|without_result)$"}'
q "jobs status v1" '{__name__=~"void_devnet_jobs_status_v1_.*"}'

echo "=== [receipts] ==="
q "receipts core" '{__name__=~"void_devnet_receipts_(total|total_v2|coverage_v2|health(_v2)?$)"}'

echo "=== [spool] ==="
q "spool health" 'void_devnet_spool_health'
