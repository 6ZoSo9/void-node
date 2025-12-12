#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"

q() {
  local expr="$1"
  local body
  if ! body="$(curl -fsS "$PROM/api/v1/query" --data-urlencode "query=$expr" 2>/dev/null)"; then
    echo "NaN"
    return 0
  fi
  echo "$body" | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

echo "=== [void-mainnet-health-summary] ==="
echo "PROM = $PROM"
echo

# Core gauges
keys_roles_ok="$(q 'void_mainnet_keys_roles_ok')"
plan_health="$(q 'void_mainnet_bootstrap_plan_health')"
safeboot_overall="$(q 'void:safeboot:overall')"
devnet_overall="$(q 'void:devnet_overall:max_5m')"
mainnet_core_health="$(q 'void_mainnet_core_health')"
lastmile_health_5m="$(q 'void:mainnet_lastmile:health:last_5m')"
workcredits_health="$(q 'void_mainnet_workcredits_health')"
pillars_with_validators_and_wc_5m="$(q "void:mainnet_pillars_with_validators_and_workcredits:health:last_5m")"

printf "%-45s %s\n" "void_mainnet_keys_roles_ok" "$keys_roles_ok"
printf "%-45s %s\n" "void_mainnet_bootstrap_plan_health" "$plan_health"
printf "%-45s %s\n" "void:safeboot:overall" "$safeboot_overall"
printf "%-45s %s\n" "void:devnet_overall:max_5m" "$devnet_overall"
printf "%-45s %s\n" "void_mainnet_core_health" "$mainnet_core_health"
printf "%-45s %s\n" "void:mainnet_lastmile:health:last_5m" "$lastmile_health_5m"
printf "%-45s %s\n" "void_mainnet_workcredits_health" "$workcredits_health"
printf "%-45s %s\n" "void:mainnet_pillars_with_validators_and_workcredits:health:last_5m" "$pillars_with_validators_and_wc_5m"

echo

overall=1
for v in \
  "$keys_roles_ok" \
  "$plan_health" \
  "$safeboot_overall" \
  "$devnet_overall" \
  "$mainnet_core_health" \
  "$lastmile_health_5m" \
  "$workcredits_health" \
  "$pillars_with_validators_and_wc_5m"
do
  if [[ "$v" != "1" ]]; then
    overall=0
  fi
done

if [[ "$overall" == "1" ]]; then
  echo "[RESULT] OK (keys + PLAN + safeboot + devnet + mainnet-core + lastmile + workcredits + composite all healthy)"
else
  echo "[RESULT] BAD (one or more gauges != 1)"
fi
