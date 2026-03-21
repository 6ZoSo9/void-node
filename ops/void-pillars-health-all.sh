#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM_URL:-http://127.0.0.1:9090}"

DN_OVERALL_WITH_TIMER="$(curl -fsS -G "$PROM/api/v1/query" --data-urlencode 'query=void_datanet_overall_health_effective' | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true)"

urlenc() {
  python3 - <<'PY' "$1"
import sys
from urllib.parse import quote
print(quote(sys.argv[1], safe=""))
PY
}

q() {
  local expr="$1"
  local enc
  enc="$(urlenc "$expr")"
  curl -fsS --max-time 4 "$PROM/api/v1/query?query=${enc}" \
    | jq -r '.data.result[0].value[1] // "nan"' \
    || echo "nan"
}

echo "[pillars-lite] prom_url=$PROM"

safeboot_overall_raw="$(q 'safeboot_overall')"
safeboot_overall="$(q 'safeboot_overall_effective')"
void_devnet_overall_health="$(q 'void_devnet_overall_health')"
void_mainnet_core_health="$(q 'void_mainnet_core_health')"
void_mainnet_core_manifest_health="$(q 'void_mainnet_core_manifest_health')"
void_mainnet_core_manifest_days="$(q 'void_mainnet_core_manifest_days')"
chosen_manifest_days="$(q 'chosen_manifest_days')"

void_datanet_overall_health="$(q 'void_datanet_overall_health')"

void_datanet_ok="$([ "${DN_OVERALL_WITH_TIMER:-0}" = "1" ] && echo 1 || echo 0)"
void_datanet_last_ok_age_seconds="$(q 'void_datanet_last_ok_age_seconds')"

echo
echo "[pillars] === key ==="
printf "  %-34s = %s\n" "safeboot_overall" "$safeboot_overall"
printf "  %-34s = %s\n" "safeboot_overall_raw" "$safeboot_overall_raw"
printf "  %-34s = %s\n" "void_devnet_overall_health" "$void_devnet_overall_health"
printf "  %-34s = %s\n" "void_mainnet_core_health" "$void_mainnet_core_health"
printf "  %-34s = %s\n" "void_mainnet_core_manifest_health" "$void_mainnet_core_manifest_health"
printf "  %-34s = %s\n" "void_mainnet_core_manifest_days" "$void_mainnet_core_manifest_days"
printf "  %-34s = %s\n" "chosen_manifest_days" "$chosen_manifest_days"
printf "  %-34s = %s\n" "void_datanet_overall_health" "$void_datanet_overall_health"
  printf "  void_datanet_overall_health_effective = %s\n" "${DN_OVERALL_WITH_TIMER:-}"
printf "  %-34s = %s\n" "void_datanet_last_ok_age_seconds" "$void_datanet_last_ok_age_seconds"

echo
echo "[pillars-lite] === summary ==="
# Require only what exists in this repo checkout: mainnet_core + manifest + datanet.
# Treat missing safeboot/devnet/chosen_manifest_days as "not installed here" (not a failure).
req_ok=1
for v in "$void_mainnet_core_health" "$void_mainnet_core_manifest_health" "${DN_OVERALL_WITH_TIMER:-}"; do
  if [[ "$v" == "nan" || "$v" == "" ]]; then req_ok=0; fi
done

echo "  mainnet_core_ok  = $void_mainnet_core_health"
echo "  manifest_ok      = $void_mainnet_core_manifest_health"
echo "  datanet_ok       = $void_datanet_ok"
echo
if [[ "$req_ok" == "1" ]]; then
  echo "[pillars-lite] RESULT: OK (mainnet-core + datanet present)"
else
  echo "[pillars-lite] RESULT: FAIL (missing required series)"
fi
