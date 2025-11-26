#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[pillars] repo=$(pwd)"
echo "[pillars] prom_url=$PROM_URL"
echo "[pillars] checking VOID safeboot + devnet + mainnet-core + manifest + keys..."

q() {
  local expr="$1"
  curl -g -fsS "$PROM_URL/api/v1/query?query=${expr}" \
    | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0"
}

SAFEBOOT_OVERALL="$(q 'void:safeboot:overall')"
DEVNET_OVERALL="$(q 'void_devnet_overall_health')"
CORE_HEALTH="$(q 'void_mainnet_core_health')"
MANIFEST_HEALTH="$(q 'void_mainnet_core_manifest_health')"
MANIFEST_DAYS="$(q 'void:mainnet_core:manifest_days_left:last')"
KEYS_HEALTH="$(q 'void_mainnet_keys_health')"

printf '  %-40s = %s\n' \
  "safeboot_overall"                            "$SAFEBOOT_OVERALL" \
  "void_devnet_overall_health"                  "$DEVNET_OVERALL" \
  "void_mainnet_core_health"                    "$CORE_HEALTH" \
  "void_mainnet_core_manifest_health"           "$MANIFEST_HEALTH" \
  "void:mainnet_core:manifest_days_left:last"   "$MANIFEST_DAYS" \
  "void_mainnet_keys_health"                    "$KEYS_HEALTH"

devnet_ok="$DEVNET_OVERALL"
mainnet_core_ok="$CORE_HEALTH"
manifest_ok="$MANIFEST_HEALTH"
safeboot_ok="$SAFEBOOT_OVERALL"
keys_ok="$KEYS_HEALTH"

pillars_ok=1
for v in "$devnet_ok" "$mainnet_core_ok" "$manifest_ok" "$safeboot_ok" "$keys_ok"; do
  if [ "$v" != "1" ]; then
    pillars_ok=0
  fi
done

echo
echo "[pillars] summary:"
printf '  %-16s = %s\n' \
  "devnet_ok"        "$devnet_ok" \
  "mainnet_core_ok"  "$mainnet_core_ok" \
  "manifest_ok"      "$manifest_ok" \
  "safeboot_ok"      "$safeboot_ok" \
  "keys_ok"          "$keys_ok"

if [ "$pillars_ok" = "1" ]; then
  echo
  echo "[pillars] RESULT: OK (safeboot+devnet+mainnet-core+manifest+keys healthy; chosen_manifest_days=$MANIFEST_DAYS)"
  exit 0
fi

echo
echo "[pillars] RESULT: FAIL (one or more pillars unhealthy)"
exit 1
