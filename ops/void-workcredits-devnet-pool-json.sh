#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

query_instant() {
  local q="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${q}"
}

extract_value() {
  jq -r '.data.result[0].value[1] // empty'
}

extract_ts() {
  jq -r '.data.result[0].value[0] // empty'
}

# Query our 5m-smoothed recording rules
wc_per_void_json="$(query_instant 'void:workcredits_devnet:wc_per_void:last_5m')"
void_res_json="$(query_instant 'void:workcredits_devnet:void_reserve_raw:last_5m')"
wc_res_json="$(query_instant 'void:workcredits_devnet:wc_reserve_raw:last_5m')"
liq_json="$(query_instant 'void:workcredits_devnet:pool_liquidity_2asset_raw:last_5m')"

wc_per_void_val="$(printf '%s\n' "$wc_per_void_json" | extract_value)"
void_res_val="$(printf '%s\n' "$void_res_json" | extract_value)"
wc_res_val="$(printf '%s\n' "$wc_res_json" | extract_value)"
liq_val="$(printf '%s\n' "$liq_json" | extract_value)"

# Prefer timestamp from wc_per_void (they all share same scrape window)
ts_val="$(printf '%s\n' "$wc_per_void_json" | extract_ts)"

if [[ -z "$wc_per_void_val" || -z "$void_res_val" || -z "$wc_res_val" || -z "$liq_val" ]]; then
  echo "{
  \"ok\": false,
  \"error\": \"missing WorkCredits devnet metrics from Prometheus\"
}"
  exit 1
fi

if [[ -z "$ts_val" ]]; then
  ts_val="0"
fi

# Emit JSON suitable for Obelisk / Trading View
cat <<EOF
{
  "ok": true,
  "chain": "devnet",
  "wcPerVoid": "$wc_per_void_val",
  "voidReserveRaw": "$void_res_val",
  "wcReserveRaw": "$wc_res_val",
  "liquidity2AssetRaw": "$liq_val",
  "updatedAt": $ts_val,
  "source": "prometheus:void-workcredits-devnet"
}
EOF
