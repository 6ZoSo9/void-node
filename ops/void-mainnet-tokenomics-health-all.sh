#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO"

echo "[tokenomics-health] repo=$REPO"
echo "[tokenomics-health] prom_url=$PROM_URL"
echo

echo "[tokenomics-health] checking core tokenomics health gauge..."
raw_core="$(curl -fsS "${PROM_URL}/api/v1/query?query=void_mainnet_tokenomics_health" || echo '')"

core_val="$(printf '%s\n' "$raw_core" \
  | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null")"

echo "[tokenomics-health]   void_mainnet_tokenomics_health = ${core_val}"

if [ "$core_val" = "null" ]; then
  echo "[tokenomics-health] RESULT: FATAL (void_mainnet_tokenomics_health missing)"
  exit 1
fi

if [ "$core_val" != "1" ]; then
  echo "[tokenomics-health] RESULT: BAD (void_mainnet_tokenomics_health != 1)"
  exit 1
fi

echo
echo "[tokenomics-health] best-effort 5m smoothed view (optional)..."
raw_smooth="$(curl -fsS "${PROM_URL}/api/v1/query?query=void:mainnet_tokenomics:health:last_5m" 2>/dev/null || echo '')"

smooth_val="$(printf '%s\n' "$raw_smooth" \
  | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo "null")"

echo "[tokenomics-health]   void:mainnet_tokenomics:health:last_5m = ${smooth_val}"

echo
echo "[tokenomics-health] RESULT: OK (void_mainnet_tokenomics_health == 1)"
