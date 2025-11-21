#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[demo-prom] void_devnet_demo_jobs_total"
curl -fsS "$PROM_URL/api/v1/query?query=void_devnet_demo_jobs_total" \
  | jq -r '.data.result[0].value // "null"'

echo "[demo-prom] void_devnet_demo_receipts_total"
curl -fsS "$PROM_URL/api/v1/query?query=void_devnet_demo_receipts_total" \
  | jq -r '.data.result[0].value // "null"'

echo "[demo-prom] void_devnet_demo_coverage"
curl -fsS "$PROM_URL/api/v1/query?query=void_devnet_demo_coverage" \
  | jq -r '.data.result[0].value // "null"'

echo "[demo-prom] void_devnet_demo_health"
curl -fsS "$PROM_URL/api/v1/query?query=void_devnet_demo_health" \
  | jq -r '.data.result[0].value // "null"'
