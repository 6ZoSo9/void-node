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

echo "=== [VOID mainnet-core summary] ==="
q "mainnet-core health" 'void_mainnet_core_health'
q "mainnet-core safeboot overall" 'void_mainnet_core_safeboot_overall'
q "mainnet-core devnet overall" 'void_mainnet_core_devnet_overall'
q "mainnet-core manifest health/days_left" '{__name__=~"void_mainnet_core_manifest_.*"}'

echo "=== [VOID safeboot summary (recordings)] ==="
q "safeboot overall" 'void:safeboot:overall_bool'
q "safeboot health_ok" 'void:safeboot:health_ok'
q "safeboot head_ok" 'void:safeboot:head_ok'

echo "=== [VOID devnet overall (source)] ==="
q "devnet overall health" 'void:devnet_overall_with_jobs_v2:health:last_5m'
