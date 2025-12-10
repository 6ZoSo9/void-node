#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [validators-health] VOID mainnet validators pillar health ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] PROM_URL  = $PROM_URL"
echo

metric_value () {
  local expr="$1"
  curl -fsS -G "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

present="$(metric_value 'void_mainnet_validators_spec_present')"
nonempty="$(metric_value 'void_mainnet_validators_spec_nonempty')"

echo "[raw] void_mainnet_validators_spec_present   = $present"
echo "[raw] void_mainnet_validators_spec_nonempty  = $nonempty"
echo

ok=1
reason=()

if [ "$present" != "1" ]; then
  ok=0
  reason+=("spec_present != 1 (file missing or exporter not run)")
fi

if [ "$nonempty" != "1" ]; then
  ok=0
  reason+=("spec_nonempty != 1 (file empty or bad path)")
fi

if [ "$ok" -eq 1 ]; then
  echo "[validators-health] RESULT: OK (validators bootstrap spec present + non-empty)"
  exit 0
else
  echo "[validators-health] RESULT: BAD"
  for r in "${reason[@]}"; do
    echo "  - $r"
  done
  exit 1
fi
