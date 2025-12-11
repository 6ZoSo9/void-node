#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$ROOT"

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq is required but not installed. sudo apt install jq" >&2
  exit 1
fi

echo "=== [VOID WorkCredits DEVNET dashboard v2] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

query_scalar () {
  local metric="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=${metric}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null \
    || echo "NaN"
}

to_pretty () {
  local v="$1"
  case "$v" in
    NaN|"") echo "unknown" ;;
    *)      echo "$v" ;;
  esac
}

echo "=== [1] raw pool gauges] ==="

VOID_RAW="$(query_scalar 'void_workcredits_devnet_void_reserve_raw')"
WC_RAW="$(query_scalar 'void_workcredits_devnet_wc_reserve_raw')"
WC_PER_VOID_RAW="$(query_scalar 'void_workcredits_devnet_wc_per_void')"
VOID_PER_WC_RAW="$(query_scalar 'void_workcredits_devnet_void_per_wc')"

VOID="$(to_pretty "$VOID_RAW")"
WC="$(to_pretty "$WC_RAW")"
WC_PER_VOID="$(to_pretty "$WC_PER_VOID_RAW")"
VOID_PER_WC="$(to_pretty "$VOID_PER_WC_RAW")"

printf "  %-38s = %s\n" "void_workcredits_devnet_void_reserve_raw" "$VOID"
printf "  %-38s = %s\n" "void_workcredits_devnet_wc_reserve_raw"   "$WC"
printf "  %-38s = %s\n" "void_workcredits_devnet_wc_per_void"      "$WC_PER_VOID"
printf "  %-38s = %s\n" "void_workcredits_devnet_void_per_wc"      "$VOID_PER_WC"
echo

echo "=== [2] pool meta series (stub vs live) ] ==="

META_JSON="$(
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode 'query=void_workcredits_devnet_pool_meta' \
  || echo '{"status":"error"}'
)"

if ! echo "$META_JSON" | jq -e '.status=="success"' >/dev/null 2>&1; then
  echo "[WARN] could not query void_workcredits_devnet_pool_meta (status != success)"
  META_COUNT=0
else
  META_COUNT="$(echo "$META_JSON" | jq '.data.result | length')"
fi

if [ "${META_COUNT:-0}" -eq 0 ]; then
  echo "[WARN] no void_workcredits_devnet_pool_meta series found in Prometheus."
else
  echo "[info] found $META_COUNT meta series:"
  echo

  echo "$META_JSON" | jq '
    .data.result[]
    | {
        job:      (.metric.job      // "n/a"),
        instance: (.metric.instance // "n/a"),
        mode:     (.metric.mode     // "n/a"),
        lp_pool:  (.metric.lp_pool  // "n/a"),
        rpc_url:  (.metric.rpc_url  // "n/a"),
        value:    .value[1]
      }
  '

  STUB_COUNT="$(echo "$META_JSON" | jq '[.data.result[] | select(.metric.mode == "stub-no-code")] | length')"
  LPPOOL_COUNT="$(echo "$META_JSON" | jq '[.data.result[] | select(.metric.lp_pool != null and .metric.lp_pool != "")] | length')"

  echo
  echo "=== [3] meta classification ] ==="
  echo "  total_series   = $META_COUNT"
  echo "  stub_series    = $STUB_COUNT        (mode=\"stub-no-code\")"
  echo "  lp_pool_series = $LPPOOL_COUNT      (has lp_pool label)"

  CLASS="unknown"
  if [ "$META_COUNT" -eq 0 ]; then
    CLASS="no-meta"
  elif [ "$STUB_COUNT" -eq "$META_COUNT" ]; then
    CLASS="stub-only"
  elif [ "$STUB_COUNT" -gt 0 ] && [ "$STUB_COUNT" -lt "$META_COUNT" ]; then
    CLASS="mixed-stub-and-nonstub"
  elif [ "$STUB_COUNT" -eq 0 ]; then
    CLASS="no-stub-label"
  fi

  echo
  echo "  classification = $CLASS"
fi

echo
echo "=== [done] WorkCredits devnet dashboard ==="
