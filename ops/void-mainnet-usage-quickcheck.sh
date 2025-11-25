#!/usr/bin/env bash
set -euo pipefail

PROM_URL="\${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local query="$1"
  curl -fsS "\$PROM_URL/api/v1/query?query=\$query"
}

echo "=== [mainnet-usage] prom_url=\$PROM_URL ==="

echo
echo ">>> void_mainnet_usage_nonempty_recent"
USAGE_NONEMPTY_RAW=$(q 'void_mainnet_usage_nonempty_recent' \
  | jq -r '.data.result[0].value[1] // "null"')
echo "void_mainnet_usage_nonempty_recent=\$USAGE_NONEMPTY_RAW"

echo
echo ">>> void_mainnet_usage_last_nonempty_gap"
USAGE_GAP_RAW=$(q 'void_mainnet_usage_last_nonempty_gap' \
  | jq -r '.data.result[0].value[1] // "null"')
echo "void_mainnet_usage_last_nonempty_gap=\$USAGE_GAP_RAW"

echo
echo ">>> void_mainnet_usage_health"
USAGE_HEALTH_RAW=$(q 'void_mainnet_usage_health' \
  | jq -r '.data.result[0].value[1] // "null"')
echo "void_mainnet_usage_health=\$USAGE_HEALTH_RAW"

echo
echo "=== [summary] ==="
echo "nonempty_recent : \$USAGE_NONEMPTY_RAW"
echo "last_nonempty_gap: \$USAGE_GAP_RAW"
echo "usage_health    : \$USAGE_HEALTH_RAW"

RESULT="BAD"
if [ "\$USAGE_HEALTH_RAW" = "1" ]; then
  RESULT="OK"
fi

echo
echo "[mainnet-usage-quickcheck] RESULT: \$RESULT"
