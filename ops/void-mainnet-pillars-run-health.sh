#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [pillars-run] VOID mainnet pillars+keys+run health (5m view) ==="
echo "[cfg] prom_url=${PROM_URL}"
echo

query_scalar() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query?query=${expr}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

pillars_keys_5m=$(query_scalar 'void:mainnet_pillars:health_with_keys:last_5m')
run_ok_raw=$(query_scalar 'void_mainnet_run_pillar_ok')
run_ok_5m=$(query_scalar 'void:mainnet_run_pillar:ok:last_5m')
run_status_5m=$(query_scalar 'void:mainnet_run_pillar_status:last_5m')
pillars_keys_run_5m=$(query_scalar 'void:mainnet_pillars:health_with_keys_and_run:last_5m')

echo "  pillars+keys (5m)           = ${pillars_keys_5m}"
echo "  run_pillar_ok (raw)         = ${run_ok_raw}"
echo "  run_pillar_ok (5m)          = ${run_ok_5m}"
echo "  run_pillar_status (5m)      = ${run_status_5m}"
echo "  pillars+keys+run (5m)       = ${pillars_keys_run_5m}"
echo

if [[ "${pillars_keys_run_5m}" == "1" ]]; then
  echo "[pillars-run] RESULT: OK (pillars+keys+run all healthy in last_5m window)"
  exit 0
else
  echo "[pillars-run] RESULT: BAD (composite pillars+keys+run != 1; inspect components above)"
  exit 1
fi
