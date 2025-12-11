#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

cd "$ROOT"

jq_check() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "[ERROR] jq is required but not installed. sudo apt install jq" >&2
    exit 1
  fi
}
jq_check

query_scalar() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$q" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN"
}

echo "=== [VOID WorkCredits DEVNET dashboard] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

echo "=== [1] raw pool gauges] ==="

VOID_RAW="$(query_scalar "void_workcredits_devnet_void_reserve_raw")"
WC_RAW="$(query_scalar "void_workcredits_devnet_wc_reserve_raw")"
WC_PER_VOID="$(query_scalar "void_workcredits_devnet_wc_per_void")"
VOID_PER_WC="$(query_scalar "void_workcredits_devnet_void_per_wc")"

printf "  void_workcredits_devnet_void_reserve_raw = %s\n" "$VOID_RAW"
printf "  void_workcredits_devnet_wc_reserve_raw   = %s\n" "$WC_RAW"
printf "  void_workcredits_devnet_wc_per_void      = %s\n" "$WC_PER_VOID"
printf "  void_workcredits_devnet_void_per_wc      = %s\n" "$VOID_PER_WC"
echo

echo "=== [2] interpretation] ==="

to_float_str() {
  local v="$1"
  case "$v" in
    NaN|"") echo "unknown" ;;
    *) echo "$v" ;;
  esac
}

VOID_STR="$(to_float_str "$VOID_RAW")"
WC_STR="$(to_float_str "$WC_RAW")"
WC_PER_VOID_STR="$(to_float_str "$WC_PER_VOID")"
VOID_PER_WC_STR="$(to_float_str "$VOID_PER_WC")"

echo "- Pool reserves (raw 18-dec units):"
echo "    VOID reserve : $VOID_STR"
echo "    WC reserve   : $WC_STR"
echo
echo "- Prices:"
echo "    WC per 1 VOID  : $WC_PER_VOID_STR"
echo "    VOID per 1 WC   : $VOID_PER_WC_STR"
echo

echo "[RESULT] If none of the values above are 'NaN' or 'unknown', the WorkCredits devnet pool exporter is healthy."
echo
echo "[HINT] Override PROM_URL if Prometheus is remote, e.g.:"
echo "       PROM_URL=http://devbox:9090 ./ops/void-workcredits-devnet-dashboard.sh"
