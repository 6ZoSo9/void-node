#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://seed.nullfeed.org}"
EXPECT_REQUESTS_ENABLED="${EXPECT_REQUESTS_ENABLED:-0}"
TEST_DELIVERY="${TEST_DELIVERY:-0x1111111111111111111111111111111111111111}"
ALLOW_REQUEST_WRITE="${ALLOW_REQUEST_WRITE:-}"
STATIC_ONLY="${STATIC_ONLY:-0}"

case "$EXPECT_REQUESTS_ENABLED" in
  0|1) ;;
  *) echo "EXPECT_REQUESTS_ENABLED must be 0 or 1" >&2; exit 2 ;;
esac

case "$STATIC_ONLY" in
  0|1) ;;
  *) echo "STATIC_ONLY must be 0 or 1" >&2; exit 2 ;;
esac

case "$PUBLIC_SEED_BASE" in
  *zoso-alienware-aurora-r7.taila47fd.ts.net*|*100.122.79.39*)
    echo "HOLD: retired Alienware public seed target is forbidden" >&2
    exit 2
    ;;
esac

echo "=== VOID Buy VOID request intake v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"
echo "expected_requests_enabled=$EXPECT_REQUESTS_ENABLED"

grep -Fq "VOID_PUBLIC_BUY_VOID_REQUEST_INTAKE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_BUY_VOID_CHECKOUT_FORM_V1" src/index.ts
grep -Fq 'process.env.VOID_BUY_REQUESTS_ENABLED || "0"' src/index.ts
! grep -Fq 'process.env.VOID_BUY_REQUESTS_ENABLED || "1"' src/index.ts
grep -Fq 'const payment_ready = !receiverBindingConflict;' src/index.ts
grep -Fq 'mode: !cfg.requests_enabled ? "request_intake_hold"' src/index.ts
grep -Fq 'request_intake_ready: cfg.requests_enabled && cfg.payment_ready' src/index.ts
grep -Fq "automatic_fulfillment: false" src/index.ts
grep -Fq "manual_review_required: true" src/index.ts

if test "$STATIC_ONLY" = 1; then
  test "$PUBLIC_SEED_BASE" = "https://seed.nullfeed.org"
  grep -Fq 'PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://seed.nullfeed.org}"' "$0"
  echo "canonical_public_seed_default=https://seed.nullfeed.org"
  echo "retired_alienware_default=false"
  echo "network_request_performed=false"
  echo "request_write_performed=false"
  echo "VOID_BUY_VOID_REQUEST_INTAKE_STATIC_V1_GREEN"
  exit 0
fi

curl -fsS --connect-timeout 10 --max-time 30   "$PUBLIC_SEED_BASE/__void/buy-void/config.json"   -o /tmp/void-buy-config-public.json
curl -fsS --connect-timeout 10 --max-time 30   "$PUBLIC_SEED_BASE/__void/buy-void/status.json"   -o /tmp/void-buy-status-public.json

EXPECT_REQUESTS_ENABLED="$EXPECT_REQUESTS_ENABLED" python3 - <<'PY'
import json, os
cfg=json.load(open("/tmp/void-buy-config-public.json"))
status=json.load(open("/tmp/void-buy-status-public.json"))
expected=os.environ["EXPECT_REQUESTS_ENABLED"]=="1"
assert cfg.get("schema") == "void_public_buy_void_config_v1", cfg
assert cfg.get("requests_enabled") is expected, cfg
assert cfg.get("payment_ready") is True, cfg
assert cfg.get("asset_in") == "USDC", cfg
assert cfg.get("asset_out") == "VOID", cfg
assert cfg.get("automatic_fulfillment") is False, cfg
assert cfg.get("manual_review_required") is True, cfg
assert status.get("schema") == "void_public_buy_void_status_v1", status
assert status.get("requests_enabled") is expected, status
assert status.get("payment_ready") is True, status
assert status.get("request_intake_ready") is expected, status
if expected:
    assert status.get("mode") != "request_intake_hold", status
else:
    assert status.get("mode") == "request_intake_hold", status
print("[ok] Buy VOID config/status match expected activation state")
PY

curl -fsS --connect-timeout 10 --max-time 30   "$PUBLIC_SEED_BASE/buy-void"   -o /tmp/void-buy-page-public.html
grep -Fq "VOID_PUBLIC_BUY_VOID_CHECKOUT_FORM_V1" /tmp/void-buy-page-public.html
grep -Fq "Create Buy VOID Request" /tmp/void-buy-page-public.html

body='{"requested_amount_usdc":"1","void_destination_address":"'"$TEST_DELIVERY"'","source_chain":"base","ack_self_custody":true,"ack_base_native_usdc":true,"ack_request_before_payment":true,"ack_sender_equals_void_destination":true,"ack_no_automatic_fulfillment":true}'

if test "$EXPECT_REQUESTS_ENABLED" = 0; then
  code="$(curl -sS --connect-timeout 10 --max-time 30     -H 'content-type: application/json'     -d "$body"     -o /tmp/void-buy-request-public.json     -w '%{http_code}'     "$PUBLIC_SEED_BASE/__void/buy-void/request")"
  test "$code" = 503
  grep -Fq '"buy_void_requests_disabled"' /tmp/void-buy-request-public.json
  echo "buy_void_request_intake_default_hold_verified=true"
  echo "payment_verification_readiness_preserved=true"
  echo "request_write_performed=false"
  echo "VOID_BUY_VOID_REQUEST_INTAKE_V1_GREEN"
  exit 0
fi

test "$ALLOW_REQUEST_WRITE" = "YES_CREATE_BOUNDED_BUY_VOID_REQUEST" || {
  echo "HOLD: active request-intake proof requires ALLOW_REQUEST_WRITE=YES_CREATE_BOUNDED_BUY_VOID_REQUEST" >&2
  exit 3
}

code="$(curl -sS --connect-timeout 10 --max-time 30   -H 'content-type: application/json'   -d "$body"   -o /tmp/void-buy-request-public.json   -w '%{http_code}'   "$PUBLIC_SEED_BASE/__void/buy-void/request")"
case "$code" in 200|201) ;; *) cat /tmp/void-buy-request-public.json >&2; exit 1 ;; esac

TEST_DELIVERY="$TEST_DELIVERY" python3 - <<'PY'
import json, os
j=json.load(open("/tmp/void-buy-request-public.json"))
assert j.get("schema") == "void_public_buy_void_checkout_request_result_v1", j
assert j.get("ok") is True, j
r=j.get("request") or {}
assert str(r.get("void_destination_address") or "").lower() == os.environ["TEST_DELIVERY"].lower(), j
assert float(r.get("usdc_amount") or r.get("requested_amount_usdc") or 0) == 1.0, j
s=r.get("safety") or {}
assert s.get("automatic_fulfillment") is False, j
assert s.get("manual_review_required") is True, j
print("[ok] explicitly authorized bounded Buy VOID request created or replayed")
PY

echo "buy_void_request_intake_active_mode_verified=true"
echo "request_write_explicitly_authorized=true"
echo "automatic_fulfillment=false"
echo "VOID_BUY_VOID_REQUEST_INTAKE_V1_GREEN"
