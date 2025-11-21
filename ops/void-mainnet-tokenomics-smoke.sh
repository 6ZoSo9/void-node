#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[tokenomics-smoke] void_mainnet_tokenomics_configured"
curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_tokenomics_configured" \
  | jq -r '.data.result[0].value // "null"'

echo "[tokenomics-smoke] void_mainnet_tokenomics_health"
curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_tokenomics_health" \
  | jq -r '.data.result[0].value // "null"'

echo "[tokenomics-smoke] void_mainnet_tokenomics_bytes"
curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_tokenomics_bytes" \
  | jq -r '.data.result[0].value // "null"'

echo "[tokenomics-smoke] void_mainnet_tokenomics_has_supply"
curl -fsS "$PROM_URL/api/v1/query?query=void_mainnet_tokenomics_has_supply" \
  | jq -r '.data.result[0].value // "null"'

echo "[tokenomics-smoke] void:mainnet_tokenomics:health:last_5m"
curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_tokenomics:health:last_5m" \
  | jq -r '.data.result[0].value // "null"'
