#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$REPO_ROOT"

echo "=== [mainnet-pillars-with-mainnet-health] VOID mainnet pillars+keys+MAINNET bootstrap health ==="
echo "[cfg] repo     = $REPO_ROOT"
echo "[cfg] prom_url = $PROM_URL"
echo

echo "[1] checking void:mainnet_pillars:health_with_mainnet:last_5m ..."
RAW_JSON="$(curl -fsS "$PROM_URL/api/v1/query?query=void:mainnet_mainnet_bootstrap:health:last_5m" || echo '')"

if [ -z "$RAW_JSON" ]; then
  echo "  -> query failed; treating as 0"
  VAL="0"
else
  VAL="$(printf '%s\n' "$RAW_JSON" | jq -r '.data.result[0].value[1] // empty')"
  if [ -z "$VAL" ]; then
    echo "  -> no series returned; treating as 0"
    VAL="0"
  else
    echo "  void:mainnet_pillars:health_with_mainnet:last_5m = $VAL"
  fi
fi

echo
echo "[summary]"
if awk "BEGIN {exit !($VAL >= 0.5)}"; then
  echo "  RESULT: OK (pillars+keys+MAINNET bootstrap healthy; >=0.5 over last 5m)"
  exit 0
else
  echo "  RESULT: BAD (void:mainnet_pillars:health_with_mainnet:last_5m < 0.5)"
  exit 1
fi
