#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

query() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get --data-urlencode "query=$q"
}

echo "=== [workcredits] mainnet WorkCredits pillar health ==="
RAW_HEALTH="$(query 'void_mainnet_workcredits_health' | jq -r '.data.result[0].value[1] // "0"')"
echo "void_mainnet_workcredits_health = $RAW_HEALTH"
echo

echo "=== [workcredits] config status ==="
query 'void_mainnet_workcredits_config' \
  | jq -r '.data.result[] | "chain_id=" + (.metric.chain_id // "?") + " reason=" + (.metric.reason // "?") + " value=" + (.value[1] // "?")'
echo

echo "=== [workcredits] individual checks ==="
query 'void_mainnet_workcredits_checks' \
  | jq -r '.data.result[] | (.metric.check // "?") + " = " + (.value[1] // "?")' \
  | sort || echo "[no checks found]"
echo

echo "=== [workcredits] composite pillars+validators+workcredits (5m) ==="
COMPOSITE_5M="$(query "void:mainnet_pillars_with_validators_and_workcredits:health:last_5m" | jq -r '.data.result[0].value[1] // "0"')"
echo "void:mainnet_pillars_with_validators_and_workcredits:health:last_5m = $COMPOSITE_5M"
echo

if [[ "$RAW_HEALTH" == "1" && "$COMPOSITE_5M" == "1" ]]; then
  echo "[OK] WorkCredits mainnet pillar is HEALTHY (and included in composite pillars)."
  exit 0
else
  echo "[WARN] WorkCredits mainnet pillar is UNHEALTHY or composite is 0."
  exit 1
fi
