#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
BUY_URL="$PUBLIC_SEED_BASE/buy-void"
STATUS_URL="$PUBLIC_SEED_BASE/__void/buy-void/status.json"

echo "=== VOID public Buy VOID v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"
echo "buy_url=$BUY_URL"
echo "status_url=$STATUS_URL"

grep -Fq "VOID_PUBLIC_BUY_VOID_ROUTE_V1" src/index.ts
grep -Fq "/buy-void" src/index.ts
grep -Fq "/__void/buy-void/status.json" src/index.ts
grep -Fq "guarded_usdc_to_void" src/index.ts
grep -Fq "automatic_fulfillment: false" src/index.ts
grep -Fq "manual_review_required: true" src/index.ts
grep -Fq "no_investment_return_promised: true" src/index.ts
grep -Fq "no_automatic_token_delivery_promised: true" src/index.ts

grep -Fq '"/buy-void"' ops/public/public-seed-adapter-v1.mjs
grep -Fq '"/__void/buy-void/status.json"' ops/public/public-seed-adapter-v1.mjs

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/public-landing-v1-proof.sh

curl -fsS --connect-timeout 10 --max-time 30 "$STATUS_URL" -o /tmp/void-buy-void-status-public.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-buy-void-status-public.json"))
assert j.get("schema") == "void_public_buy_void_status_v1", j
assert j.get("ok") is True, j
assert j.get("mode") == "guarded_request_only", j
assert j.get("funding_model") == "guarded_usdc_to_void", j
flow = j.get("flow") or {}
assert flow.get("automatic_fulfillment") is False, j
assert flow.get("manual_review_required") is True, j
assets = j.get("assets") or {}
assert assets.get("asset_in") == "USDC", j
assert assets.get("asset_out") == "VOID", j
safety = j.get("safety") or {}
assert safety.get("no_investment_return_promised") is True, j
assert safety.get("no_automatic_token_delivery_promised") is True, j
assert safety.get("private_rpc_public") is False, j
print("[ok] buy VOID status json safe")
PY

curl -fsS --connect-timeout 10 --max-time 30 "$BUY_URL" -o /tmp/void-buy-void-public.html
grep -Fq "VOID_PUBLIC_BUY_VOID_ROUTE_V1" /tmp/void-buy-void-public.html
grep -Fq "Buy VOID / Fund Development" /tmp/void-buy-void-public.html
grep -Fq "USDC → VOID" /tmp/void-buy-void-public.html
grep -Fq "No automatic token delivery is promised" /tmp/void-buy-void-public.html
grep -Fq "No investment return" /tmp/void-buy-void-public.html
grep -Fq "Do not send from an exchange" /tmp/void-buy-void-public.html

echo "[ok] public Buy VOID v1 proof green"
