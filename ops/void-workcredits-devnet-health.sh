#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [workcredits-devnet health] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

for bin in curl jq bc; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[ERROR] missing required tool: $bin" >&2
    exit 1
  fi
done

promq() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get --data-urlencode "query=$q" \
    | jq -r '.data.result[0].value[1] // "NaN"'
}

echo "=== [1] raw gauges] ==="
UP="$(promq "void_workcredits_devnet_up{chain=\"devnet\"}")"
VOID_RAW="$(promq "void_workcredits_devnet_void_reserve_raw{chain=\"devnet\"}")"
WC_RAW="$(promq "void_workcredits_devnet_wc_reserve_raw{chain=\"devnet\"}")"
WC_PER_VOID="$(promq "void_workcredits_devnet_wc_per_void{chain=\"devnet\"}")"
VOID_PER_WC="$(promq "void_workcredits_devnet_void_per_wc{chain=\"devnet\"}")"

printf "  up                = %s\n" "$UP"
printf "  void_reserve_raw  = %s\n" "$VOID_RAW"
printf "  wc_reserve_raw    = %s\n" "$WC_RAW"
printf "  wc_per_void       = %s\n" "$WC_PER_VOID"
printf "  void_per_wc       = %s\n" "$VOID_PER_WC"
echo

fail=0

# Accept plain decimals + scientific notation, then let bc decide
num_gt_zero() {
  local v="$1"
  # must look like a numeric-ish token
  if ! printf '%s\n' "$v" | grep -Eq '^[0-9.+\-eE]+$'; then
    return 1
  fi
  echo "$v > 0" | bc -l >/dev/null 2>&1
}

if [ "$UP" != "1" ]; then
  echo "[FAIL] void_workcredits_devnet_up != 1 (got: $UP)"
  fail=1
else
  echo "[OK] up gauge == 1"
fi

if ! num_gt_zero "$VOID_RAW"; then
  echo "[FAIL] void_reserve_raw not > 0 (got: $VOID_RAW)"
  fail=1
else
  echo "[OK] void_reserve_raw > 0"
fi

if ! num_gt_zero "$WC_RAW"; then
  echo "[FAIL] wc_reserve_raw not > 0 (got: $WC_RAW)"
  fail=1
else
  echo "[OK] wc_reserve_raw > 0"
fi

if ! num_gt_zero "$WC_PER_VOID"; then
  echo "[FAIL] wc_per_void not > 0 (got: $WC_PER_VOID)"
  fail=1
else
  echo "[OK] wc_per_void > 0"
fi

if ! num_gt_zero "$VOID_PER_WC"; then
  echo "[FAIL] void_per_wc not > 0 (got: $VOID_PER_WC)"
  fail=1
else
  echo "[OK] void_per_wc > 0"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "[SUMMARY] WorkCredits devnet pool looks healthy (basic invariants pass)."
  exit 0
else
  echo "[SUMMARY] WorkCredits devnet pool health FAILED one or more checks."
  exit 1
fi
