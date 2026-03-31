#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-participant-proof-user-$(date +%Y%m%d-%H%M%S)}"
PLAINTEXT="${PLAINTEXT:-participant economic proof $(date +%Y%m%d-%H%M%S)}"
CREDIT_DELTA="${CREDIT_DELTA:-10}"
REDEEM_AMOUNT="${REDEEM_AMOUNT:-3}"
OUT="${OUT:-/tmp/participant-economic-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

jget() {
  curl -fsS --max-time "${2:-8}" "$1"
}

jpost() {
  local url="$1"
  local body="$2"
  curl -fsS --max-time "${3:-12}" -H 'content-type: application/json' -X POST "$url" --data "$body"
}

echo "=== [1] baseline network truth ==="
READY0="$(jget "$BASE/__void/ready.json" 5)"
HEALTH0="$(jget "$BASE/health" 5)"
HEAD0="$(jget "$BASE/head.txt" 5)"
printf '%s\n' "$READY0" | tee "$OUT/ready-before.json"
printf '%s\n' "$HEALTH0" | tee "$OUT/health-before.json"
printf '%s\n' "$HEAD0" | tee "$OUT/head-before.txt"

python3 - "$READY0" "$HEALTH0" "$HEAD0" <<'PY'
import json, sys
ready = json.loads(sys.argv[1])
health = json.loads(sys.argv[2])
head = int(sys.argv[3].strip())
assert ready.get("ready") is True, "ready before != true"
assert ready.get("gap") == 0, f"gap before != 0: {ready.get('gap')}"
assert ready.get("txroot_live") == 1, f"txroot_live before != 1: {ready.get('txroot_live')}"
assert str(health.get("nodeId") or ""), "missing nodeId before"
assert head >= 0, "bad head before"
print("[ok] baseline node truth clean")
PY

echo
echo "=== [2] participant balances before ==="
BAL0="$(jget "$BASE/wc/balance?account=$ACCOUNT" 5)"
RED0="$(jget "$BASE/wc/redeemable?account=$ACCOUNT" 5)"
printf '%s\n' "$BAL0" | tee "$OUT/balance-before.json"
printf '%s\n' "$RED0" | tee "$OUT/redeemable-before.json"

echo
echo "=== [3] submit participant work ==="
SUBMIT="$(jpost "$BASE/jobs/submit" "{\"account\":\"$ACCOUNT\",\"kind\":\"datanet_publish\",\"plaintext\":\"$PLAINTEXT\"}" 12)"
printf '%s\n' "$SUBMIT" | tee "$OUT/job-submit.json"

JOB_ID="$(printf '%s\n' "$SUBMIT" | python3 -c 'import sys,json; o=json.load(sys.stdin); print((o.get("job") or {}).get("job_id",""))')"
test -n "$JOB_ID"

JOB=""
STATUS=""
for i in $(seq 1 20); do
  JOB="$(jget "$BASE/jobs/$JOB_ID" 10)"
  printf '%s\n' "$JOB" | tee "$OUT/job-$i.json" >/dev/null
  STATUS="$(printf '%s\n' "$JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("status",""))')"
  echo "job_status=$STATUS poll=$i"
  [ "$STATUS" = "completed" ] && break
  sleep 1
done
test "$STATUS" = "completed"

RECEIPT_ID="$(printf '%s\n' "$JOB" | python3 -c 'import sys,json; rs=json.load(sys.stdin).get("receipts",[]); print((rs[0] if rs else {}).get("receipt_id",""))')"
DATASET_ID="$(printf '%s\n' "$JOB" | python3 -c 'import sys,json; print((json.load(sys.stdin).get("job") or {}).get("dataset_id",""))')"
test -n "$RECEIPT_ID"
test -n "$DATASET_ID"

echo "job_id=$JOB_ID"
echo "receipt_id=$RECEIPT_ID"
echo "dataset_id=$DATASET_ID"

echo
echo "=== [4] prove participant receipt exists ==="
RECS="$(jget "$BASE/receipts?account=$ACCOUNT" 10)"
printf '%s\n' "$RECS" | tee "$OUT/receipts-after-submit.json"

python3 - "$OUT/receipts-after-submit.json" "$RECEIPT_ID" "$DATASET_ID" <<'PY'
import json, sys
o = json.load(open(sys.argv[1]))
receipt_id = sys.argv[2]
dataset_id = sys.argv[3]
recs = o.get("receipts") or []
hit = None
for r in recs:
    if str(r.get("receipt_id") or "") == receipt_id:
        hit = r
        break
assert hit, f"receipt not found: {receipt_id}"
assert str(hit.get("dataset_id") or "") == dataset_id, f"dataset mismatch: {hit.get('dataset_id')} vs {dataset_id}"
print("[ok] participant receipt found")
PY

echo
echo "=== [5] award WC for that receipt ==="
CREDIT="$(jpost "$BASE/wc/credit" "{\"account\":\"$ACCOUNT\",\"delta\":$CREDIT_DELTA,\"reason\":\"participant_proof\",\"job_id\":\"$JOB_ID\",\"receipt_id\":\"$RECEIPT_ID\"}" 10)"
printf '%s\n' "$CREDIT" | tee "$OUT/wc-credit.json"

echo
echo "=== [6] participant balances after credit ==="
BAL1="$(jget "$BASE/wc/balance?account=$ACCOUNT" 5)"
RED1="$(jget "$BASE/wc/redeemable?account=$ACCOUNT" 5)"
LEDGER1="$(jget "$BASE/wc/ledger?account=$ACCOUNT" 5)"
printf '%s\n' "$BAL1" | tee "$OUT/balance-after-credit.json"
printf '%s\n' "$RED1" | tee "$OUT/redeemable-after-credit.json"
printf '%s\n' "$LEDGER1" | tee "$OUT/ledger-after-credit.json"

echo
echo "=== [7] redeem some WC ==="
REDEEM="$(jpost "$BASE/wc/redeem" "{\"account\":\"$ACCOUNT\",\"amount\":$REDEEM_AMOUNT}" 10)"
printf '%s\n' "$REDEEM" | tee "$OUT/redeem.json"

echo
echo "=== [8] participant balances after redeem ==="
BAL2="$(jget "$BASE/wc/balance?account=$ACCOUNT" 5)"
RED2="$(jget "$BASE/wc/redeemable?account=$ACCOUNT" 5)"
REDEEMED2="$(jget "$BASE/wc/redeemed?account=$ACCOUNT" 5)"
printf '%s\n' "$BAL2" | tee "$OUT/balance-after-redeem.json"
printf '%s\n' "$RED2" | tee "$OUT/redeemable-after-redeem.json"
printf '%s\n' "$REDEEMED2" | tee "$OUT/redeemed-after-redeem.json"

echo
echo "=== [9] final network truth ==="
READY2="$(jget "$BASE/__void/ready.json" 5)"
HEALTH2="$(jget "$BASE/health" 5)"
HEAD2="$(jget "$BASE/head.txt" 5)"
printf '%s\n' "$READY2" | tee "$OUT/ready-after.json"
printf '%s\n' "$HEALTH2" | tee "$OUT/health-after.json"
printf '%s\n' "$HEAD2" | tee "$OUT/head-after.txt"

python3 - \
  "$OUT/balance-before.json" \
  "$OUT/redeemable-before.json" \
  "$OUT/balance-after-credit.json" \
  "$OUT/redeemable-after-credit.json" \
  "$OUT/balance-after-redeem.json" \
  "$OUT/redeemable-after-redeem.json" \
  "$OUT/redeemed-after-redeem.json" \
  "$OUT/ready-after.json" \
  "$OUT/health-after.json" \
  "$OUT/head-after.txt" \
  "$CREDIT_DELTA" \
  "$REDEEM_AMOUNT" <<'PY'
import json, sys

bal0 = json.load(open(sys.argv[1]))
red0 = json.load(open(sys.argv[2]))
bal1 = json.load(open(sys.argv[3]))
red1 = json.load(open(sys.argv[4]))
bal2 = json.load(open(sys.argv[5]))
red2 = json.load(open(sys.argv[6]))
redeemed2 = json.load(open(sys.argv[7]))
ready2 = json.load(open(sys.argv[8]))
health2 = json.load(open(sys.argv[9]))
head2 = int(open(sys.argv[10]).read().strip())
credit_delta = float(sys.argv[11])
redeem_amount = float(sys.argv[12])

balance0 = float(bal0.get("balance") or 0)
redeemable0 = float(red0.get("redeemable") or 0)
earned0 = float(red0.get("earned") or 0)

balance1 = float(bal1.get("balance") or 0)
redeemable1 = float(red1.get("redeemable") or 0)
earned1 = float(red1.get("earned") or 0)

balance2 = float(bal2.get("balance") or 0)
redeemable2 = float(red2.get("redeemable") or 0)
earned2 = float(red2.get("earned") or 0)
redeemed_final = float(redeemed2.get("redeemed") or 0)

assert balance1 >= balance0 + credit_delta - 1e-9, f"balance did not increase by credit delta: {balance0} -> {balance1}"
assert earned1 >= earned0 + credit_delta - 1e-9, f"earned did not increase by credit delta: {earned0} -> {earned1}"
assert redeemable1 >= redeemable0 + credit_delta - 1e-9, f"redeemable did not increase by credit delta: {redeemable0} -> {redeemable1}"
assert balance2 == balance1, f"balance changed unexpectedly after redeem: {balance1} -> {balance2}"
assert earned2 == earned1, f"earned changed unexpectedly after redeem: {earned1} -> {earned2}"
assert redeemable2 <= redeemable1 - redeem_amount + 1e-9, f"redeemable did not decrease by redeem amount: {redeemable1} -> {redeemable2}"
assert redeemed_final >= redeem_amount - 1e-9, f"redeemed total too small: {redeemed_final}"

assert ready2.get("ready") is True, "ready after != true"
assert ready2.get("gap") == 0, f"gap after != 0: {ready2.get('gap')}"
assert ready2.get("txroot_live") == 1, f"txroot_live after != 1: {ready2.get('txroot_live')}"
assert str(health2.get("nodeId") or ""), "missing nodeId after"
assert head2 >= 0, "bad head after"

print("[ok] participant economic proof validated")
print(json.dumps({
    "ok": True,
    "earned_before": earned0,
    "redeemable_before": redeemable0,
    "earned_after_credit": earned1,
    "redeemable_after_credit": redeemable1,
    "earned_after_redeem": earned2,
    "redeemable_after_redeem": redeemable2,
    "redeemed_total": redeemed_final,
    "head_after": head2
}, indent=2))
PY

echo
echo "=== [10] success ==="
echo "[ok] participant economic proof green"
