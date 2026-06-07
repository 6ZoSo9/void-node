#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/funding-support-v1.md"
PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
FUNDING_URL="$PUBLIC_SEED_BASE/funding"
STATUS_URL="$PUBLIC_SEED_BASE/__void/funding/status.json"

echo "=== VOID funding/support v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"
echo "funding_url=$FUNDING_URL"
echo "status_url=$STATUS_URL"

grep -Fq "USDC -> VOID" "$DOC"
grep -Fq "guarded Buy VOID" "$DOC"
grep -Fq "fulfillment is manual/guarded, not automatic" "$DOC"
grep -Fq "no automatic token delivery is promised" "$DOC"
grep -Fq "no investment return is promised" "$DOC"

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/vps-public-seed-internet-proof-v2.sh

curl -fsS --max-time 10 "$STATUS_URL" -o /tmp/void-funding-status-public.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/void-funding-status-public.json"))
assert j.get("schema") == "void_public_funding_status_v1", j
assert j.get("ok") is True, j
assert j.get("funding_model") == "guarded_usdc_to_void", j
fp = j.get("funding_path") or {}
assert fp.get("asset_in") == "USDC", j
assert fp.get("asset_out") == "VOID", j
assert fp.get("automatic_fulfillment") is False, j
assert fp.get("manual_review_required") is True, j
safety = j.get("safety") or {}
assert safety.get("no_investment_return_promised") is True, j
assert safety.get("no_automatic_token_delivery_promised") is True, j
assert safety.get("private_rpc_public") is False, j
print("[ok] funding status json safe")
PY

curl -fsS --max-time 10 "$FUNDING_URL" -o /tmp/void-funding-public.html
grep -Fq "VOID Network Funding" /tmp/void-funding-public.html
grep -Fq "USDC -&gt; VOID" /tmp/void-funding-public.html
grep -Fq "No automatic token delivery is promised" /tmp/void-funding-public.html
grep -Fq "No investment return" /tmp/void-funding-public.html
grep -Fq "/rpc" /tmp/void-funding-public.html

echo "[ok] funding/support v1 proof green"
