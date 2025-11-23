#!/usr/bin/env bash
set -euo pipefail
PROM="${PROM:-http://127.0.0.1:9090}"

q() {
  local label="$1"
  local expr="$2"
  local v
  v="$(curl -g -fsS "$PROM/api/v1/query?query=$expr" \
      | jq -r '.data.result[0].value[1] // "null"')" || v="null"
  printf "%-48s %s\n" "$label" "$v"
}

echo '=== [VOID mainnet last-mile traffic smoke] ==='
echo

# Raw last-mile block stats
q "last_block_txs (void_mainnet_last_block_txs)" \
  'max(void_mainnet_last_block_txs)'

q "last_block_nonempty (void_mainnet_last_block_nonempty)" \
  'max(void_mainnet_last_block_nonempty)'

echo
# Last-mile health gauges we already wired
q "lastmile_raw (void_mainnet_lastmile_health)" \
  'max(void_mainnet_lastmile_health)'

q "lastmile_last (void:mainnet_lastmile_health:last)" \
  'max(void:mainnet_lastmile_health:last)'

echo
# Traffic alert predicate (the thing VoidMainnetLastmileNoTxs10m watches)
q "no-tx-10m predicate (max_over_time nonempty[10m])" \
  'max_over_time(void_mainnet_last_block_nonempty[10m])'

echo
echo '=== [summary] ==='
raw="$(curl -g -fsS "$PROM/api/v1/query?query=max_over_time(void_mainnet_last_block_nonempty[10m])" \
       | jq -r '.data.result[0].value[1] // "null"' 2>/dev/null || echo null)"

if [ "$raw" = "null" ]; then
  echo "no data for void_mainnet_last_block_nonempty; traffic alert may never fire (exporter/metrics missing)."
elif [ "$raw" = "0" ] || [ "$raw" = "0.000000" ]; then
  echo "no non-empty blocks seen in last 10m (alert condition satisfied; alert will fire as soon as the rule evaluates)."
else
  echo "at least one non-empty block in last 10m (alert condition NOT satisfied)."
fi
