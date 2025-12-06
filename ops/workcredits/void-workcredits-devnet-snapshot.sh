#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
NODE_EXPORTER_URL="${NODE_EXPORTER_URL:-http://127.0.0.1:9100}"

q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=${expr}" \
  | jq -r '
      if (.data.result | length) == 0 then
        "NaN"
      else
        .data.result[0].value[1]
      end
    '
}

node_metric() {
  local name="$1"
  curl -fsS "$NODE_EXPORTER_URL/metrics" \
  | awk -v n="$name" '
      $1 ~ "^" n "{chain=\"devnet\"}" {
        print $2;
        exit
      }
    '
}

up_last_1m="$(q "void:workcredits_devnet:up:last_1m")"
has_liq_last_1m="$(q "void:workcredits_devnet:has_liquidity:last_1m")"

void_raw="$(node_metric "void_workcredits_devnet_void_reserve_raw")"
wc_raw="$(node_metric   "void_workcredits_devnet_wc_reserve_raw")"
wc_per_void="$(node_metric  "void_workcredits_devnet_wc_per_void")"
void_per_wc="$(node_metric  "void_workcredits_devnet_void_per_wc")"

echo "=== WorkCredits devnet snapshot ==="
echo "up_last_1m           : ${up_last_1m}"
echo "has_liquidity_last_1m: ${has_liq_last_1m}"
echo
echo "void_reserve_raw     : ${void_raw}"
echo "wc_reserve_raw       : ${wc_raw}"
echo "wc_per_void          : ${wc_per_void}"
echo "void_per_wc          : ${void_per_wc}"
echo
echo "--- JSON (for future Obelisk Trading View) ---"

jq -n \
  --arg chain "devnet" \
  --arg up_last_1m "$up_last_1m" \
  --arg has_liq_last_1m "$has_liq_last_1m" \
  --arg void_raw "$void_raw" \
  --arg wc_raw "$wc_raw" \
  --arg wc_per_void "$wc_per_void" \
  --arg void_per_wc "$void_per_wc" \
'{
  chain: $chain,
  up_last_1m: $up_last_1m,
  has_liquidity_last_1m: $has_liq_last_1m,
  void_reserve_raw: $void_raw,
  wc_reserve_raw: $wc_raw,
  wc_per_void: $wc_per_void,
  void_per_wc: $void_per_wc
}'
