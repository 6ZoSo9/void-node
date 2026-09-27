#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
EXPECT_REQUESTS_ENABLED="${EXPECT_REQUESTS_ENABLED:-0}"
TEST_DELIVERY="${TEST_DELIVERY:-0x1111111111111111111111111111111111111111}"
ALLOW_REQUEST_WRITE="${ALLOW_REQUEST_WRITE:-}"

case "$EXPECT_REQUESTS_ENABLED" in
  0|1) ;;
  *) echo "EXPECT_REQUESTS_ENABLED must be 0 or 1" >&2; exit 2 ;;
esac

echo "=== VOID Buy VOID request intake v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"
echo "expected_requests_enabled=$EXPECT_REQUESTS_ENABLED"

grep -Fq "VOID_PUBLIC_BUY_VOID_REQUEST_INTAKE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_BUY_VOID_CHECKOUT_FORM_V1" src/index.ts
grep -Fq 'process.env.VOID_BUY_REQUESTS_ENABLED || "0"' src/index.ts
! grep -Fq 'process.env.VOID_BUY_REQUESTS_ENABLED || "1"' src/index.ts
grep -Fq "/__void/buy-void/config.json" src/index.ts
grep -Fq 'app.post("/__void/buy-void/request"' src/index.ts
grep -Fq "automatic_fulfillment: false" src/index.ts
grep -Fq "manual_review_required: true" src/index.ts

curl -fsS --connect-timeout 10 --max-time 30 \
  "$PUBLIC_SEED_BASE/__void/buy-void/config.json" \
  -o /tmp/void-buy-config-public.json

EXPECT_REQUESTS_ENABLED="$EXPECT_REQUESTS_ENABLED" python3 - <<'PY'
import json, os
j=json.load(open("/tmp/void-buy-config-public.json"))
expected=os.environ["EXPECT_REQUESTS_ENABLED"]=="1"
assert j.get("schema") == "void_public_buy_void_config_v1", j
assert j.get("requests_enabled") is expected, j
if expected:
    assert j.get("payment_ready") is True, j
else:
    assert j.get("payment_ready") is False, j
assert j.get("asset_in") == "USDC", j
assert j.get("asset_out") == "VOID", j
assert j.get("automatic_fulfillment") is False, j
assert j.get("manual_review_required") is True, j
print("[ok] Buy VOID config matches expected activation state")
PY

curl -fsS --connect-timeout 10 --max-time 30 \
  "$PUBLIC_SEED_BASE/buy-void" \
  -o /tmp/void-buy-page-public.html
grep -Fq "VOID_PUBLIC_BUY_VOID_CHECKOUT_FORM_V1" /tmp/void-buy-page-public.html
grep -Fq "Create Buy VOID Request" /tmp/void-buy-page-public.html

if test "$EXPECT_REQUESTS_ENABLED" = 0; then
  body='{"requested_amount_usdc":"1","void_destination_address":"'"$TEST_DELIVERY"'","source_chain":"base","ack_self_custody":true,"ack_base_native_usdc":true,"ack_request_before_payment":true,"ack_sender_equals_void_destination":true,"ack_no_automatic_fulfillment":true}'
  code="$(curl -sS --connect-timeout 10 --max-time 30 \
    -H 'content-type: application/json' \
    -d "$body" \
    -o /tmp/void-buy-request-public.json \
    -w '%{http_code}' \
    "$PUBLIC_SEED_BASE/__void/buy-void/request")"
  test "$code" = 503
  grep -Fq '"buy_void_requests_disabled"' /tmp/void-buy-request-public.json
  echo "buy_void_request_intake_default_hold_verified=true"
  echo "request_write_performed=false"
  echo "VOID_BUY_VOID_REQUEST_INTAKE_V1_GREEN"
  exit 0
fi

test "$ALLOW_REQUEST_WRITE" = "YES_CREATE_BOUNDED_BUY_VOID_REQUEST" || {
  echo "HOLD: active request-intake proof requires ALLOW_REQUEST_WRITE=YES_CREATE_BOUNDED_BUY_VOID_REQUEST" >&2
  exit 3
}

echo "HOLD: active request-write execution remains an explicit operator action"
exit 3
