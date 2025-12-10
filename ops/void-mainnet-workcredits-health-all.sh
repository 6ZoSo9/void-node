#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // "NaN"'
}

echo "=== [workcredits health-all] VOID mainnet WorkCredits pillar ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

spec_present="$(q 'void_mainnet_workcredits_spec_present')"
spec_nonempty="$(q 'void_mainnet_workcredits_spec_nonempty')"
health="$(q 'void_mainnet_workcredits_health')"

echo "[raw gauges]"
echo "  void_mainnet_workcredits_spec_present   = $spec_present"
echo "  void_mainnet_workcredits_spec_nonempty  = $spec_nonempty"
echo "  void_mainnet_workcredits_health         = $health"
echo

spec_ok=0
if [[ "$spec_present" == "1" && "$spec_nonempty" == "1" ]]; then
  spec_ok=1
fi

echo "[summary]"
echo "  spec_ok  = $spec_ok"
echo "  health   = $health"
echo

if [[ "$spec_ok" == "1" && "$health" == "1" ]]; then
  echo "[workcredits-health] RESULT: OK (spec present+nonempty and health==1)"
  exit 0
else
  echo "[workcredits-health] RESULT: BAD (WorkCredits pillar not healthy yet)"
  exit 1
fi
