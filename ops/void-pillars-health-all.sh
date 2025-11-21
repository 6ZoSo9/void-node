#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q_scalar() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
  | jq -r '.data.result[0].value[1] // "NaN"'
}

echo "[pillars] checking VOID safeboot + devnet + mainnet-core..."

safeboot_overall=$(q_scalar 'void:safeboot:overall')
devnet_overall=$(q_scalar 'void_devnet_overall_health')
mainnet_core_health=$(q_scalar 'void_mainnet_core_health')
mainnet_core_manifest_health=$(q_scalar 'void_mainnet_core_manifest_health')
mainnet_core_manifest_days=$(q_scalar 'void_mainnet_core_manifest_days_left')

echo "  safeboot_overall                 = $safeboot_overall"
echo "  void_devnet_overall_health       = $devnet_overall"
echo "  void_mainnet_core_health         = $mainnet_core_health"
echo "  void_mainnet_core_manifest_health= $mainnet_core_manifest_health"
echo "  void_mainnet_core_manifest_days  = $mainnet_core_manifest_days"

ok=1

[[ "$safeboot_overall" == "1" ]] || ok=0
[[ "$devnet_overall" == "1" ]] || ok=0
[[ "$mainnet_core_health" == "1" ]] || ok=0
[[ "$mainnet_core_manifest_health" == "1" ]] || ok=0

# require at least 7 days left on mainnet-core manifest
if [[ "$mainnet_core_manifest_days" == "NaN" ]] || (( ${mainnet_core_manifest_days%.*} < 7 )); then
  ok=0
fi

if [[ "$ok" == "1" ]]; then
  echo
  echo "[pillars] RESULT: OK (safeboot+devnet+mainnet-core healthy, manifest_days>=7)"
  exit 0
else
  echo
  echo "[pillars] RESULT: BAD (see values above)"
  exit 1
fi
