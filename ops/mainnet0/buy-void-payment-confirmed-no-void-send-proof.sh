#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_USDC="${AMOUNT_USDC:-25}"
TMP="${TMP:-/tmp/void-buy-payment-confirmed-no-void-send}"
NOTE="ops/mainnet0/buy-void-base-claim-rehearsal.current.md"

mkdir -p "$TMP"

echo "=== Buy VOID payment-confirmed no-VOID-send proof ==="
echo "base=$BASE"
echo "account=$ACCOUNT"
echo "amount_usdc=$AMOUNT_USDC"

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] build ==="
npm run build

echo
echo "=== [3] readiness before ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready-before.json"
cat "$TMP/ready-before.json"
echo

echo
echo "=== [4] resolve delivery wallet ==="
DELIVERY_WALLET=""

if [ -f "$NOTE" ]; then
  DELIVERY_WALLET="$(grep -E '^Delivery wallet:' "$NOTE" | head -n 1 | awk '{print $3}' || true)"
fi

if [ -z "$DELIVERY_WALLET" ]; then
  DELIVERY_WALLET="$(curl -fsS "$BASE/__void/participant/wallet/status?account=${ACCOUNT}" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("address","") if j.get("ok") and j.get("has_wallet") else "")')"
fi

if [ -z "$DELIVERY_WALLET" ]; then
  echo "[ERR] no delivery wallet available"
  exit 1
fi

echo "delivery_wallet=$DELIVERY_WALLET"

echo
echo "=== [5] create disposable request ==="
CREATE_JSON="$(curl -fsS   -H 'content-type: application/json'   -d "{\"account\":\"${ACCOUNT}\",\"delivery_wallet\":\"${DELIVERY_WALLET}\",\"requested_amount_usdc\":\"${AMOUNT_USDC}\"}"   "$BASE/__void/participant/buy-void/request")"
printf '%s
' "$CREATE_JSON" > "$TMP/create.json"
python3 -m json.tool "$TMP/create.json" | sed -n '1,120p'

REQUEST_ID="$(python3 - "$TMP/create.json" <<'PY2'
import json, sys
j=json.load(open(sys.argv[1]))
print((j.get("request") or {}).get("request_id",""))
PY2
)"

test -n "$REQUEST_ID"
echo "request_id=$REQUEST_ID"

echo
echo "=== [6] queue disposable request ==="
QUEUE_JSON="$(curl -fsS   -H 'content-type: application/json'   -d "{\"request_id\":\"${REQUEST_ID}\",\"operator_note\":\"queued for payment-confirmed no-void-send proof\"}"   "$BASE/__void/operator/buy-void/queue")"
printf '%s
' "$QUEUE_JSON" > "$TMP/queue.json"
python3 -m json.tool "$TMP/queue.json" | sed -n '1,120p'

QUEUE_ID="$(python3 - "$TMP/queue.json" <<'PY2'
import json, sys
j=json.load(open(sys.argv[1]))
print((j.get("queued") or {}).get("queue_id",""))
PY2
)"

test -n "$QUEUE_ID"
echo "queue_id=$QUEUE_ID"

echo
echo "=== [7] create disposable watch target ==="
WATCH_JSON="$(curl -fsS   -H 'content-type: application/json'   -d "{\"queue_id\":\"${QUEUE_ID}\",\"operator_note\":\"watch target for payment-confirmed no-void-send proof\"}"   "$BASE/__void/operator/buy-void/watch-targets")"
printf '%s
' "$WATCH_JSON" > "$TMP/watch.json"
python3 -m json.tool "$TMP/watch.json" | sed -n '1,140p'

WATCH_ID="$(python3 - "$TMP/watch.json" <<'PY2'
import json, sys
j=json.load(open(sys.argv[1]))
print((j.get("watch") or {}).get("watch_id",""))
PY2
)"

test -n "$WATCH_ID"
echo "watch_id=$WATCH_ID"

echo
echo "=== [8] record manual payment_confirmed observation ==="
PAYMENT_REF="base_tx_confirmed_manual_no_void_send_proof_$(date +%Y%m%d_%H%M%S)"

CONFIRMED_JSON="$(curl -fsS   -H 'content-type: application/json'   -d "{\"watch_id\":\"${WATCH_ID}\",\"observe_status\":\"payment_confirmed\",\"observed_amount_usdc\":\"${AMOUNT_USDC}\",\"payment_ref\":\"${PAYMENT_REF}\",\"operator_note\":\"manual payment_confirmed no VOID send proof\"}"   "$BASE/__void/operator/buy-void/watch-targets/observe")"
printf '%s
' "$CONFIRMED_JSON" > "$TMP/confirmed.json"
python3 -m json.tool "$TMP/confirmed.json" | sed -n '1,180p'

echo
echo "=== [9] assert payment_confirmed and no VOID tx before fulfillment attempt ==="
curl -fsS "$BASE/__void/operator/buy-void/watch-targets/status?watch_id=${WATCH_ID}" > "$TMP/watch-before-fulfill.json"
curl -fsS "$BASE/__void/operator/buy-void/queue/status?queue_id=${QUEUE_ID}" > "$TMP/queue-before-fulfill.json"

python3 - "$TMP/watch-before-fulfill.json" "$TMP/queue-before-fulfill.json" "$PAYMENT_REF" <<'PY2'
import json, sys
w=json.load(open(sys.argv[1])).get("watch") or {}
q=json.load(open(sys.argv[2])).get("queued") or {}
payment_ref=sys.argv[3]

assert w.get("watch_status") == "payment_confirmed_recorded", w
assert w.get("payment_ref") == payment_ref, w
assert w.get("observed_amount_match") is True, w
assert not w.get("void_tx_ref"), w

assert q.get("operator_status") == "payment_confirmed", q
assert q.get("payment_ref") == payment_ref, q
assert not q.get("void_tx_ref"), q

print("[ok] payment_confirmed recorded and no VOID tx ref exists")
PY2

echo
echo "=== [10] fulfillment without void_tx_ref must still fail ==="
curl -sS -i   -H 'content-type: application/json'   -d "{\"watch_id\":\"${WATCH_ID}\",\"fulfill_status\":\"void_sent\",\"operator_note\":\"should fail without void tx ref\"}"   "$BASE/__void/operator/buy-void/watch-targets/fulfill" > "$TMP/missing-void-tx.http"

sed -n '1,100p' "$TMP/missing-void-tx.http"
grep -q "400 Bad Request" "$TMP/missing-void-tx.http"
grep -q "missing_void_tx_ref" "$TMP/missing-void-tx.http"

echo
echo "=== [11] assert still no VOID-send mutation ==="
curl -fsS "$BASE/__void/operator/buy-void/watch-targets/status?watch_id=${WATCH_ID}" > "$TMP/watch-after.json"
curl -fsS "$BASE/__void/operator/buy-void/queue/status?queue_id=${QUEUE_ID}" > "$TMP/queue-after.json"

python3 - "$TMP/watch-before-fulfill.json" "$TMP/watch-after.json" "$TMP/queue-before-fulfill.json" "$TMP/queue-after.json" <<'PY2'
import json, sys
wb=json.load(open(sys.argv[1])).get("watch") or {}
wa=json.load(open(sys.argv[2])).get("watch") or {}
qb=json.load(open(sys.argv[3])).get("queued") or {}
qa=json.load(open(sys.argv[4])).get("queued") or {}

assert wa.get("watch_id") == wb.get("watch_id"), (wb, wa)
assert wa.get("watch_status") == wb.get("watch_status") == "payment_confirmed_recorded", (wb, wa)
assert wa.get("payment_ref") == wb.get("payment_ref"), (wb, wa)
assert not wa.get("void_tx_ref"), wa

assert qa.get("queue_id") == qb.get("queue_id"), (qb, qa)
assert qa.get("operator_status") == qb.get("operator_status") == "payment_confirmed", (qb, qa)
assert qa.get("payment_ref") == qb.get("payment_ref"), (qb, qa)
assert not qa.get("void_tx_ref"), qa

print("[ok] no void_sent/completed transition and no void_tx_ref mutation")
PY2

echo
echo "=== [12] readiness after ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready-after.json"
cat "$TMP/ready-after.json"
echo

python3 - "$TMP/ready-after.json" <<'PY2'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot still green")
PY2

cat > "$TMP/report.json" <<EOF2
{
  "ok": true,
  "request_id": "$REQUEST_ID",
  "queue_id": "$QUEUE_ID",
  "watch_id": "$WATCH_ID",
  "payment_ref": "$PAYMENT_REF",
  "void_send_attempted": false,
  "void_tx_ref_recorded": false,
  "expected_queue_status": "payment_confirmed"
}
EOF2

echo
cat "$TMP/report.json"
echo
echo "[ok] Buy VOID payment-confirmed no-VOID-send proof passed"
