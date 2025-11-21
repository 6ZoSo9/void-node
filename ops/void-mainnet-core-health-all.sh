#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q_scalar() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
  | jq -r '.data.result[0].value[1] // "NaN"'
}

echo "[mainnet-core] checking pillar metrics..."

safeboot_overall=$(q_scalar 'void:safeboot:overall')
core_health=$(q_scalar 'void_mainnet_core_health')
core_health_last=$(q_scalar 'void:mainnet_core:health:last_5m')
manifest_health=$(q_scalar 'void_mainnet_core_manifest_health')
manifest_days=$(q_scalar 'void_mainnet_core_manifest_days_left')

echo "  safeboot_overall                 = $safeboot_overall"
echo "  void_mainnet_core_health         = $core_health"
echo "  void:mainnet_core:health:last_5m = $core_health_last"
echo "  manifest_health                  = $manifest_health"
echo "  manifest_days_left               = $manifest_days"

ok=1

[[ "$safeboot_overall" == "1" ]] || ok=0
[[ "$core_health" == "1" ]] || ok=0
[[ "$core_health_last" == "1" ]] || ok=0
[[ "$manifest_health" == "1" ]] || ok=0

# require at least 7 days left on manifest
if [[ "$manifest_days" == "NaN" ]] || (( ${manifest_days%.*} < 7 )); then
  ok=0
fi

if [[ "$ok" == "1" ]]; then
  echo
  echo "[mainnet-core] RESULT: OK (pillar healthy and manifest days_left>=7)"
  exit 0
else
  echo
  echo "[mainnet-core] RESULT: BAD (see values above)"
  exit 1
fi
