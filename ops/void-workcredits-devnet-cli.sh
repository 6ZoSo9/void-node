#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
API_URL="${API_URL:-http://127.0.0.1:4100/workcredits/devnet/pool}"

cd "$ROOT"

json="$(curl -fsS "$API_URL")"

ok="$(echo "$json" | jq -r '.ok')"
chain="$(echo "$json" | jq -r '.chain')"
wc_per_void="$(echo "$json" | jq -r '.wcPerVoid')"
void_res="$(echo "$json" | jq -r '.voidReserveRaw')"
wc_res="$(echo "$json" | jq -r '.wcReserveRaw')"
liq2="$(echo "$json" | jq -r '.liquidity2AssetRaw')"
updated_at="$(echo "$json" | jq -r '.updatedAt')"

if [ "$ok" != "true" ]; then
  echo "[ERR] pool ok=false – JSON:"
  echo "$json" | jq '.'
  exit 1
fi

if [ "$chain" != "devnet" ]; then
  echo "[ERR] expected chain=devnet, got chain=$chain"
  exit 1
fi

# crude “human” conversion (18-dec assets)
to_human() {
  local raw="$1"
  # print with 18 decimals as X.YYYYY...
  python3 - "$raw" <<'PY'
import decimal, sys
raw = decimal.Decimal(sys.argv[1])
scale = decimal.Decimal(10) ** 18
print((raw / scale).normalize())
PY
}

void_human="$(to_human "$void_res")"
wc_human="$(to_human "$wc_res")"
liq2_human="$(to_human "$liq2")"

echo "=== VOID / WorkCredits devnet pool ==="
echo "chain         : $chain"
echo "wcPerVoid     : $wc_per_void   (WC per 1 VOID)"
echo "void reserve  : $void_human VOID"
echo "wc reserve    : $wc_human WC"
echo "2-asset liq   : $liq2_human (VOID+WC, 18-dec units)"
echo "updated_at    : $updated_at"
echo
echo "Interpretation:"
echo "  - 1 VOID ≈ ${wc_per_void} WC on devnet right now."
echo "  - Reserves show total liquidity backing the price."
