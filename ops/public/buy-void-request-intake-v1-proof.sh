#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
TEST_DELIVERY="${TEST_DELIVERY:-0x1111111111111111111111111111111111111111}"

echo "=== VOID Buy VOID request intake v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"

grep -Fq "VOID_PUBLIC_BUY_VOID_REQUEST_INTAKE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_BUY_VOID_REQUEST_FORM_V1" src/index.ts
grep -Fq "/__void/buy-void/config.json" src/index.ts
grep -Fq "/__void/buy-void/request.json" src/index.ts
grep -Fq "automatic_fulfillment: false" src/index.ts
grep -Fq "manual_review_required: true" src/index.ts
grep -Fq '"/__void/buy-void/config.json"' ops/public/public-seed-adapter-v1.mjs
grep -Fq '"/__void/buy-void/request.json"' ops/public/public-seed-adapter-v1.mjs

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/buy-void-public-v1-proof.sh

curl -fsS --connect-timeout 10 --max-time 30 "$PUBLIC_SEED_BASE/__void/buy-void/config.json" -o /tmp/void-buy-config-public.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-buy-config-public.json"))
assert j.get("schema") == "void_public_buy_void_config_v1", j
assert j.get("mode") == "guarded_request_intake", j
assert j.get("requests_enabled") is True, j
assert j.get("asset_in") == "USDC", j
assert j.get("asset_out") == "VOID", j
assert j.get("automatic_fulfillment") is False, j
assert j.get("manual_review_required") is True, j
print("[ok] buy config safe")
PY

curl -fsS --connect-timeout 10 --max-time 30 "$PUBLIC_SEED_BASE/buy-void" -o /tmp/void-buy-page-public.html
grep -Fq "VOID_PUBLIC_BUY_VOID_REQUEST_FORM_V1" /tmp/void-buy-page-public.html
grep -Fq "Create Buy VOID Request" /tmp/void-buy-page-public.html

REQ_URL="$PUBLIC_SEED_BASE/__void/buy-void/request.json?usdc_amount=1&delivery_address=$TEST_DELIVERY&source_chain=base"
HTTP_CODE="$(curl -sS --connect-timeout 10 --max-time 30 -o /tmp/void-buy-request-public.json -w "%{http_code}" "$REQ_URL")"

if [ "$HTTP_CODE" = "503" ]; then
  grep -Fq "buy_void_receive_address_not_configured" /tmp/void-buy-request-public.json
  echo "[blocked] request intake route exists but receive address is not configured"
  exit 2
fi

test "$HTTP_CODE" = "200"
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-buy-request-public.json"))
assert j.get("schema") == "void_public_buy_void_request_v1", j
assert j.get("ok") is True, j
assert j.get("funding_model") == "guarded_usdc_to_void", j
assert j.get("asset_in") == "USDC", j
assert j.get("asset_out") == "VOID", j
assert j.get("usdc_amount") == 1, j
assert j.get("quoted_void") == 100, j
safety=j.get("safety") or {}
assert safety.get("automatic_fulfillment") is False, j
assert safety.get("manual_review_required") is True, j
assert safety.get("no_investment_return_promised") is True, j
assert safety.get("no_automatic_token_delivery_promised") is True, j
assert j.get("persisted",{}).get("ok") is True, j
print("[ok] public buy request created and persisted")
PY

echo "[ok] Buy VOID request intake v1 proof green"
