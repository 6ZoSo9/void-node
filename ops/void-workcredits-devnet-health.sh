#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
NODE_URL="${NODE_URL:-http://127.0.0.1:4100}"

cd "$REPO_ROOT"

jq_bin="${JQ_BIN:-jq}"
curl_bin="${CURL_BIN:-curl}"

echo "=== [workcredits-devnet] VOID WorkCredits devnet health ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] PROM_URL  = $PROM_URL"
echo "[cfg] NODE_URL  = $NODE_URL"
echo

echo "=== [1] node JSON: /workcredits/devnet/health ==="
set +e
hc_json="$($curl_bin -fsS "$NODE_URL/workcredits/devnet/health" 2>/dev/null)"
status=$?
set -e

if [ $status -ne 0 ] || [ -z "$hc_json" ]; then
  echo "[health] ERROR: failed to fetch /workcredits/devnet/health from $NODE_URL"
  exit 2
fi

printf '%s\n' "$hc_json" | $jq_bin .

ok_flag="$(printf '%s\n' "$hc_json" | $jq_bin -r '.ok // false')"
rpc_url="$(printf '%s\n' "$hc_json" | $jq_bin -r '.rpc_url // "<none>"')"
pool_addr="$(printf '%s\n' "$hc_json" | $jq_bin -r '.pool.pool_address // .pool.pool_address // "null"')"

echo
echo "=> JSON ok        : $ok_flag"
echo "=> RPC URL        : $rpc_url"
echo "=> pool_address   : $pool_addr"
echo

echo "=== [2] node JSON: /workcredits/devnet/pool ==="
pool_json="$($curl_bin -fsS "$NODE_URL/workcredits/devnet/pool")"
printf '%s\n' "$pool_json" | $jq_bin .

void_raw="$(printf '%s\n' "$pool_json" | $jq_bin -r '.void_reserve_raw // "0"')"
wc_raw="$(printf '%s\n' "$pool_json" | $jq_bin -r '.wc_reserve_raw // "0"')"
wc_per_void="$(printf '%s\n' "$pool_json" | $jq_bin -r '.wc_per_void // 0')"
void_per_wc="$(printf '%s\n' "$pool_json" | $jq_bin -r '.void_per_wc // 0')"

echo
echo "=> VOID reserve raw : $void_raw"
echo "=> WC reserve raw   : $wc_raw"
echo "=> WC per 1 VOID    : $wc_per_void"
echo "=> VOID per 1 WC    : $void_per_wc"
echo

echo "=== [3] Prometheus recordings (1m windows) ==="
echo "--- void:workcredits_devnet:up:last_1m ---"
$curl_bin -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void:workcredits_devnet:up:last_1m' \
  | $jq_bin '.data.result'

echo
echo "--- void:workcredits_devnet:has_liquidity:last_1m ---"
$curl_bin -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void:workcredits_devnet:has_liquidity:last_1m' \
  | $jq_bin '.data.result'

up_val="$($curl_bin -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void:workcredits_devnet:up:last_1m' \
  | $jq_bin -r '.data.result[0].value[1] // "0"')"

echo
echo "=== [4] summary ==="
echo "WorkCredits devnet exporter up (1m view): $up_val"
if [ "$up_val" != "1" ]; then
  echo "[result] BAD: exporter not healthy in last minute"
  exit 3
fi

echo "[result] OK: exporter healthy; liquidity flag = void:workcredits_devnet:has_liquidity:last_1m (see above)"
