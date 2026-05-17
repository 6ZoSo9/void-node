#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_USDC="${AMOUNT_USDC:-25}"
TMP="${TMP:-/tmp/void-buy-queue-txref-guard-proof}"
mkdir -p "$TMP"

echo "=== Buy VOID queue tx-ref guard proof ==="

echo
echo "=== [1] build + restart ==="
npm run build
systemctl --user restart void-node.service

READY_OK=0
for i in $(seq 1 120); do
  if curl -fsS "$BASE/__void/ready.json" > "$TMP/ready.json"; then
    if python3 - "$TMP/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
PY
    then
      READY_OK=1
      break
    fi
  fi
  sleep 1
done
test "$READY_OK" = "1"
cat "$TMP/ready.json"
echo

echo
echo "=== [2] create request + queue ==="
WALLET="$(curl -fsS "$BASE/__void/participant/wallet/status?account=${ACCOUNT}" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("address","") if j.get("ok") and j.get("has_wallet") else "")')"
test -n "$WALLET"
echo "wallet=$WALLET"

curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"account\":\"${ACCOUNT}\",\"delivery_wallet\":\"${WALLET}\",\"requested_amount_usdc\":\"${AMOUNT_USDC}\"}" \
  "$BASE/__void/participant/buy-void/request" > "$TMP/create.json"

REQUEST_ID="$(python3 - "$TMP/create.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print((j.get("request") or {}).get("request_id",""))
PY
)"
test -n "$REQUEST_ID"
echo "request_id=$REQUEST_ID"

curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"request_id\":\"${REQUEST_ID}\",\"operator_note\":\"queued for txref guard proof\"}" \
  "$BASE/__void/operator/buy-void/queue" > "$TMP/queue.json"

QUEUE_ID="$(python3 - "$TMP/queue.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print((j.get("queued") or {}).get("queue_id",""))
PY
)"
test -n "$QUEUE_ID"
echo "queue_id=$QUEUE_ID"

step_json() {
  local status="$1"
  local payref="${2:-}"
  local voidref="${3:-}"
  local out="$4"
  curl -fsS \
    -H 'content-type: application/json' \
    -d "{\"queue_id\":\"${QUEUE_ID}\",\"operator_status\":\"${status}\",\"operator_note\":\"txref guard proof\",\"payment_ref\":\"${payref}\",\"void_tx_ref\":\"${voidref}\"}" \
    "$BASE/__void/operator/buy-void/queue/transition" > "$out"
}

step_http() {
  local status="$1"
  local payref="${2:-}"
  local voidref="${3:-}"
  local out="$4"
  curl -sS -i \
    -H 'content-type: application/json' \
    -d "{\"queue_id\":\"${QUEUE_ID}\",\"operator_status\":\"${status}\",\"operator_note\":\"txref guard proof\",\"payment_ref\":\"${payref}\",\"void_tx_ref\":\"${voidref}\"}" \
    "$BASE/__void/operator/buy-void/queue/transition" > "$out"
}

echo
echo "=== [3] payment can confirm without VOID tx ==="
step_json payment_seen base_tx_seen_queue_txf_guard "" "$TMP/payment-seen.json"
step_json payment_confirmed base_tx_confirmed_queue_txf_guard "" "$TMP/payment-confirmed.json"

curl -fsS "$BASE/__void/operator/buy-void/queue/status?queue_id=${QUEUE_ID}" > "$TMP/before.json"
python3 - "$TMP/before.json" <<'PY'
import json, sys
q=json.load(open(sys.argv[1])).get("queued") or {}
assert q.get("operator_status") == "payment_confirmed", q
assert q.get("payment_ref") == "base_tx_confirmed_queue_txf_guard", q
assert not q.get("void_tx_ref"), q
print("[ok] payment_confirmed has no void_tx_ref")
PY

echo
echo "=== [4] void_sent without void_tx_ref must fail and not mutate ==="
step_http void_sent base_tx_confirmed_queue_txf_guard "" "$TMP/missing.http"
sed -n '1,100p' "$TMP/missing.http"
grep -q "400 Bad Request" "$TMP/missing.http"
grep -q "missing_void_tx_ref" "$TMP/missing.http"

curl -fsS "$BASE/__void/operator/buy-void/queue/status?queue_id=${QUEUE_ID}" > "$TMP/after-missing.json"
python3 - "$TMP/before.json" "$TMP/after-missing.json" <<'PY'
import json, sys
b=json.load(open(sys.argv[1])).get("queued") or {}
a=json.load(open(sys.argv[2])).get("queued") or {}
assert a.get("queue_id") == b.get("queue_id"), (b,a)
assert a.get("operator_status") == "payment_confirmed", a
assert a.get("payment_ref") == b.get("payment_ref"), (b,a)
assert not a.get("void_tx_ref"), a
print("[ok] missing txref did not mutate queue")
PY

echo
echo "=== [5] explicit void_tx_ref allows fulfillment states ==="
step_json void_sent base_tx_confirmed_queue_txf_guard void_tx_queue_txf_guard_001 "$TMP/void-sent.json"
python3 - "$TMP/void-sent.json" <<'PY'
import json, sys
q=json.load(open(sys.argv[1])).get("queued") or {}
assert q.get("operator_status") == "void_sent", q
assert q.get("void_tx_ref") == "void_tx_queue_txf_guard_001", q
print("[ok] void_sent recorded explicit txref")
PY

step_json completed base_tx_confirmed_queue_txf_guard "" "$TMP/completed.json"
python3 - "$TMP/completed.json" <<'PY'
import json, sys
q=json.load(open(sys.argv[1])).get("queued") or {}
assert q.get("operator_status") == "completed", q
assert q.get("void_tx_ref") == "void_tx_queue_txf_guard_001", q
print("[ok] completed preserved txref")
PY

echo
echo "=== [6] final path/status stay green ==="
bash ops/mainnet/mainnet0-final-path-proof.sh
bash ops/mainnet/mainnet0-status-smoke.sh

echo
echo "[ok] Buy VOID queue tx-ref guard proof passed"
