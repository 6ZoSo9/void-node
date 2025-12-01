#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet-pillars-keys-health] VOID mainnet pillars + keys health ==="
echo "[cfg] PROM_URL = ${PROM_URL}"
echo

echo "=== [1] raw pillars health (without keys) ==="
curl -fsS "${PROM_URL}/api/v1/query" \
  --get \
  --data-urlencode 'query=void:mainnet_pillars:health:last_5m' \
  | jq '.data.result' || {
    echo "[ERROR] failed to query void:mainnet_pillars:health:last_5m"
    exit 1
  }

PILLARS_VAL=$(
  curl -fsS "${PROM_URL}/api/v1/query" \
    --get \
    --data-urlencode 'query=void:mainnet_pillars:health:last_5m' \
  | jq -r '.data.result[0].value[1] // empty'
)

echo
echo "=== [2] pillars+keys health (AND via PromQL) ==="
curl -fsS "${PROM_URL}/api/v1/query" \
  --get \
  --data-urlencode 'query=void:mainnet_pillars:health_with_keys:last_5m' \
  | jq '.data.result' || {
    echo "[ERROR] failed to query void:mainnet_pillars:health_with_keys:last_5m"
    exit 1
  }

WITH_KEYS_VAL=$(
  curl -fsS "${PROM_URL}/api/v1/query" \
    --get \
    --data-urlencode 'query=void:mainnet_pillars:health_with_keys:last_5m' \
  | jq -r '.data.result[0].value[1] // empty'
)

echo
echo "=== [3] summary ==="
echo "  pillars_last_5m        = ${PILLARS_VAL:-<none>}"
echo "  pillars_with_keys_5m   = ${WITH_KEYS_VAL:-<none>}"

if [[ -z "${WITH_KEYS_VAL:-}" ]]; then
  echo
  echo "[RESULT] BAD: no series for void:mainnet_pillars:health_with_keys:last_5m"
  exit 1
fi

if (( $(printf '%s\n' "$WITH_KEYS_VAL" | awk '{print ($1 < 1)}') )); then
  echo
  echo "[RESULT] BAD: pillars_with_keys_5m != 1 (value=${WITH_KEYS_VAL})"
  exit 1
fi

echo
echo "[RESULT] OK: mainnet pillars AND keys roles are healthy over last 5m."
