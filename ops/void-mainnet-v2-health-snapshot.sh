#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=${expr}" \
  | jq -r '.data.result[0].value[1] // "NaN"' || echo "NaN"
}

echo "=== [void mainnet v2 health snapshot] ==="

core_ok=$(q 'void:mainnet_core_v2:core_ok:last_5m')
echo "--- void:mainnet_core_v2:core_ok:last_5m"
echo "$(date +%s).xxx	${core_ok}"

lastmile_ok=$(q 'void:mainnet_core_v2:lastmile_ok:last_5m')
echo
echo "--- void:mainnet_core_v2:lastmile_ok:last_5m"
echo "$(date +%s).xxx	${lastmile_ok}"

txroot_ok=$(q 'void:mainnet_core_v2:txroot_ok:last_5m')
echo
echo "--- void:mainnet_core_v2:txroot_ok:last_5m"
echo "$(date +%s).xxx	${txroot_ok}"

proposer_ok=$(q 'void:mainnet_core_v2:proposer_ok:last_5m')
echo
echo "--- void:mainnet_core_v2:proposer_ok:last_5m"
echo "$(date +%s).xxx	${proposer_ok}"

tokenomics_ok=$(q 'void:mainnet_core_v2:tokenomics_ok:last_5m')
echo
echo "--- void:mainnet_core_v2:tokenomics_ok:last_5m"
echo "$(date +%s).xxx	${tokenomics_ok}"

health_core=$(q 'void:mainnet_core_v2:health:last_5m')
echo
echo "--- void:mainnet_core_v2:health:last_5m"
echo "$(date +%s).xxx	${health_core}"

overall_core=$(q 'void:mainnet_overall_v2:core:last_5m')
echo
echo "--- void:mainnet_overall_v2:core:last_5m"
echo "$(date +%s).xxx	${overall_core}"

overall_token=$(q 'void:mainnet_overall_v2:tokenomics:last_5m')
echo
echo "--- void:mainnet_overall_v2:tokenomics:last_5m"
echo "$(date +%s).xxx	${overall_token}"

overall_health=$(q 'void:mainnet_overall_v2:health:last_5m')
echo
echo "--- void:mainnet_overall_v2:health:last_5m"
echo "$(date +%s).xxx	${overall_health}"

overall_v2_alias=$(q 'void:mainnet_overall:health:last_5m_v2')
echo
echo "--- void:mainnet_overall:health:last_5m_v2"
echo "$(date +%s).xxx	${overall_v2_alias}"

echo
echo "=== [end snapshot] ==="

# Exit non-zero if any scalar is not exactly 1 (hard gate for CI/hooks if you want)
fail=0
for v in "$core_ok" "$lastmile_ok" "$txroot_ok" "$proposer_ok" "$tokenomics_ok" "$health_core" "$overall_core" "$overall_token" "$overall_health" "$overall_v2_alias"; do
  if [[ "$v" != "1" ]]; then
    fail=1
  fi
done

if (( fail == 0 )); then
  echo "[mainnet-v2] RESULT: OK (all v2 mainnet health scalars==1)"
else
  echo "[mainnet-v2] RESULT: BAD (one or more v2 health scalars != 1)" >&2
fi

exit "$fail"
