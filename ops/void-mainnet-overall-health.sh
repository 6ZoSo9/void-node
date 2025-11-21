#!/usr/bin/env bash
set -euo pipefail

prom_url="${1:-http://127.0.0.1:9090}"

echo "[mainnet-overall] prom_url=$prom_url"

q='void:mainnet_overall:health:last_5m'

raw=$(curl -fsS "$prom_url/api/v1/query" --data-urlencode "query=$q")
val=$(printf '%s\n' "$raw" | jq -r '.data.result[0].value[1] // "null"')

echo "[mainnet-overall] void:mainnet_overall:health:last_5m = $val"

if [ "$val" != "1" ]; then
  echo "[mainnet-overall] RESULT: BAD (overall health != 1)"
  exit 1
fi

echo "[mainnet-overall] RESULT: OK (mainnet overall health==1)"
