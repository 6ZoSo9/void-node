#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_pillars.prom}"

jq_bin="${JQ_BIN:-jq}"

query_scalar() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=${expr}" |
    "$jq_bin" -r '.data.result[0].value[1]' 2>/dev/null || echo "NaN"
}

safeboot_overall="$(query_scalar 'void:safeboot:overall')"
devnet_overall="$(query_scalar 'void_devnet_overall_health')"
mainnet_core_health="$(query_scalar 'void_mainnet_core_health')"
mainnet_core_manifest_health="$(query_scalar 'void_mainnet_core_manifest_health')"
mainnet_core_manifest_days="$(query_scalar 'void_mainnet_core_manifest_days_left')"

health=0
days_int=0

if [[ "$mainnet_core_manifest_days" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  days_int="${mainnet_core_manifest_days%.*}"
fi

if [[ "$safeboot_overall" == "1" && \
      "$devnet_overall" == "1" && \
      "$mainnet_core_health" == "1" && \
      "$mainnet_core_manifest_health" == "1" && \
      "$days_int" -ge 7 ]]; then
  health=1
fi

tmp="$(mktemp)"
cat > "$tmp" <<EOF
# HELP void_pillars_health VOID pillars health (1=ok,0=bad)
# TYPE void_pillars_health gauge
void_pillars_health $health
# HELP void_pillars_manifest_days_min minimum mainnet-core manifest days_left
# TYPE void_pillars_manifest_days_min gauge
void_pillars_manifest_days_min $mainnet_core_manifest_days
EOF

mv "$tmp" "$OUT"
