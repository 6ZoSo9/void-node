#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [pillars-keys-ai-health] VOID mainnet pillars+keys+AI health ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

echo "=== [0] raw gauges ==="
curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void_mainnet_ai_pillar_health' \
  | jq '.data.result[]? | {metric, value}' || echo "[ai_pillar] no samples"

echo
curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void_mainnet_pillars_with_keys_ai' \
  | jq '.data.result[]? | {metric, value}' || echo "[pillars_with_keys_ai] no samples"

echo
echo "=== [1] quick interpretation ==="
AI=$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void_mainnet_ai_pillar_health' \
  | jq -r '.data.result[0].value[1] // ""' || true)

COMPOSITE=$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void_mainnet_pillars_with_keys_ai' \
  | jq -r '.data.result[0].value[1] // ""' || true)

echo "[interp] ai_pillar                  = ${AI:-<none>}"
echo "[interp] pillars_with_keys_ai       = ${COMPOSITE:-<none>}"

STATUS="UNKNOWN"

if [ "$AI" = "1" ] && [ "$COMPOSITE" = "1" ]; then
  STATUS="OK (pillars + keys + AI all green)"
elif [ "$AI" = "1" ] && [ "$COMPOSITE" = "0" ]; then
  STATUS="WARN (AI OK, but composite says something else is wrong)"
elif [ "$AI" = "0" ] && [ "$COMPOSITE" = "1" ]; then
  STATUS="INCONSISTENT (composite green but AI pillar 0; bug?)"
elif [ "$AI" = "0" ] && [ "$COMPOSITE" = "0" ]; then
  STATUS="BAD (AI and composite both failing)"
fi

echo "[interp] STATUS                     = $STATUS"
echo
echo "=== [pillars-keys-ai-health] done ==="
