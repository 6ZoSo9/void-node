#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

echo "=== [validators health-all] VOID mainnet validators pillar ==="
echo "[cfg] PROM_URL = $PROM_URL"

spec_present="$(q 'void_mainnet_validators_spec_present')"
spec_nonempty="$(q 'void_mainnet_validators_spec_nonempty')"
validators_health="$(q 'void_mainnet_validators_health')"
run_5m="$(q 'void:mainnet_validators:run:last_5m')"
pillars_with_validators_raw="$(q 'void_mainnet_pillars_with_validators_health')"
pillars_with_validators_5m="$(q 'void:mainnet_pillars_with_validators:health:last_5m')"

echo
echo "[raw gauges]"
echo "  void_mainnet_validators_spec_present              = $spec_present"
echo "  void_mainnet_validators_spec_nonempty             = $spec_nonempty"
echo "  void_mainnet_validators_health                    = $validators_health"
echo "  void:mainnet_validators:run:last_5m               = $run_5m"
echo "  void_mainnet_pillars_with_validators_health       = $pillars_with_validators_raw"
echo "  void:mainnet_pillars_with_validators:health:last_5m = $pillars_with_validators_5m"

spec_ok=0
run_ok=0
combo_ok=0

if [ "$spec_present" = "1" ] && [ "$spec_nonempty" = "1" ] && [ "$validators_health" = "1" ]; then
  spec_ok=1
fi

if [ "$run_5m" = "1" ]; then
  run_ok=1
fi

if [ "$pillars_with_validators_5m" = "1" ]; then
  combo_ok=1
fi

echo
echo "[summary]"
echo "  spec_ok                  = $spec_ok"
echo "  run_ok                   = $run_ok"
echo "  pillars_with_validators_ok = $combo_ok"

if [ "$spec_ok" = "1" ] && [ "$run_ok" = "1" ] && [ "$combo_ok" = "1" ]; then
  echo
  echo "[validators-health] RESULT: OK (spec + run + pillars-with-validators all healthy)"
  exit 0
else
  echo
  echo "[validators-health] RESULT: FAILED (see gauges above)"
  exit 1
fi
