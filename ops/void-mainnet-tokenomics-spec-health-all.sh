#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[tokenomics-spec-health] repo=$ROOT"
echo "[tokenomics-spec-health] prom_url=$PROM_URL"
echo

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query?query=${expr// /%20}" \
    | jq -r '.data.result[0].value[1] // "null"'
}

base="$(q 'void_mainnet_tokenomics_spec_health')"
slo="$(q 'void:mainnet_tokenomics:spec_health:last_5m')"

echo "  void_mainnet_tokenomics_spec_health         = $base"
echo "  void:mainnet_tokenomics:spec_health:last_5m = $slo"
echo

if [ "$base" = "1" ] && [ "$slo" = "1" ]; then
  echo "[tokenomics-spec-health] RESULT: OK (spec health gauges == 1)"
  exit 0
fi

echo "[tokenomics-spec-health] RESULT: BAD (expected both == 1)" >&2
exit 1
