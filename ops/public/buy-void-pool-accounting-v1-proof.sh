#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
TEST_DELIVERY="${TEST_DELIVERY:-0x1111111111111111111111111111111111111111}"

echo "=== VOID Buy VOID pool accounting v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"

grep -Fq "VOID_BUY_VOID_POOL_ACCOUNTING_V1" src/index.ts
grep -Fq "VOID_BUY_VOID_SALE_STATE_UI_V1" src/index.ts
grep -Fq 'VOID_BUY_POOL_VOID_TOTAL || "10000000"' src/index.ts
grep -Fq 'VOID_BUY_PRICE_USDC_PER_VOID || "0.50"' src/index.ts
grep -Fq 'VOID_BUY_RATE_VOID_PER_USDC || "2"' src/index.ts
grep -Fq "/__void/buy-void/sale-state.json" src/index.ts
grep -Fq "buy_void_pool_sold_out" src/index.ts
grep -Fq "buy_void_request_exceeds_remaining_pool" src/index.ts
grep -Fq '"/__void/buy-void/sale-state.json"' ops/public/public-seed-adapter-v1.mjs

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/buy-void-public-v1-proof.sh

curl -fsS --connect-timeout 10 --max-time 30 "$PUBLIC_SEED_BASE/__void/buy-void/sale-state.json" -o /tmp/void-buy-sale-state-public.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-buy-sale-state-public.json"))
assert j.get("schema") == "void_buy_void_sale_state_v1", j
assert j.get("pool_void_total") == 10000000, j
assert float(j.get("price_usdc_per_void")) == 0.5, j
assert j.get("rate_void_per_usdc") == 2, j
assert j.get("max_raise_usdc") == 5000000, j
assert "raised_usdc_so_far" in j, j
assert "remaining_void" in j, j
assert "sold_out" in j, j
print("[ok] public sale state economics correct")
PY

curl -fsS --connect-timeout 10 --max-time 30 "$PUBLIC_SEED_BASE/buy-void" -o /tmp/void-buy-page-pool-public.html
grep -Fq "10,000,000 VOID" /tmp/void-buy-page-pool-public.html
grep -Fq '$0.50 USDC per VOID' /tmp/void-buy-page-pool-public.html
grep -Fq "Sale state" /tmp/void-buy-page-pool-public.html
grep -Fq "Raised so far" /tmp/void-buy-page-pool-public.html

# Public request route may be blocked if receive address not configured; that's acceptable.
REQ_URL="$PUBLIC_SEED_BASE/__void/buy-void/request.json?usdc_amount=1&delivery_address=$TEST_DELIVERY&source_chain=base"
HTTP_CODE="$(curl -sS --connect-timeout 10 --max-time 30 -o /tmp/void-buy-pool-request-public.json -w "%{http_code}" "$REQ_URL")"
if [ "$HTTP_CODE" = "200" ]; then
  python3 - <<'PY'
import json
j=json.load(open("/tmp/void-buy-pool-request-public.json"))
assert j.get("quoted_void") == 2, j
assert j.get("price_usdc_per_void") == 0.5, j
assert j.get("pool_void_total") == 10000000, j
print("[ok] public request quote uses $0.50/VOID")
PY
elif [ "$HTTP_CODE" = "503" ]; then
  grep -Fq "buy_void_receive_address_not_configured" /tmp/void-buy-pool-request-public.json
  echo "[blocked] request intake present but receive address not configured"
else
  echo "[fail] unexpected request HTTP_CODE=$HTTP_CODE"
  cat /tmp/void-buy-pool-request-public.json
  exit 1
fi

echo "[ok] Buy VOID pool accounting v1 proof green"
