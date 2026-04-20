#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_USDC="${AMOUNT_USDC:-25}"
OUT_JSON="${OUT_JSON:-/tmp/buy-void-operator-lifecycle-proof.$(date +%Y%m%d-%H%M%S).json}"

echo "=== [1] participant wallet truth ==="
WALLET="$(curl -fsS "${BASE}/__void/participant/wallet/status?account=${ACCOUNT}" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("address","") if j.get("ok") and j.get("has_wallet") else "")')"
echo "wallet=${WALLET}"

if [ -z "$WALLET" ]; then
  echo "[ERR] no execution wallet mapped for account ${ACCOUNT}"
  exit 1
fi

echo
echo "=== [2] create participant request draft ==="
CREATE_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"account\":\"${ACCOUNT}\",\"delivery_wallet\":\"${WALLET}\",\"requested_amount_usdc\":\"${AMOUNT_USDC}\"}" \
  "${BASE}/__void/participant/buy-void/request")"
printf '%s\n' "$CREATE_JSON"

REQUEST_ID="$(printf '%s\n' "$CREATE_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("request") or {}).get("request_id",""))')"

echo
echo "=== [3] queue request ==="
QUEUE_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"request_id\":\"${REQUEST_ID}\",\"operator_note\":\"queued for lifecycle proof\"}" \
  "${BASE}/__void/operator/buy-void/queue")"
printf '%s\n' "$QUEUE_JSON"

QUEUE_ID="$(printf '%s\n' "$QUEUE_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("queued") or {}).get("queue_id",""))')"

step() {
  local status="$1"
  local note="$2"
  local payref="${3:-}"
  local voidref="${4:-}"
  curl -fsS \
    -H 'content-type: application/json' \
    -d "{\"queue_id\":\"${QUEUE_ID}\",\"operator_status\":\"${status}\",\"operator_note\":\"${note}\",\"payment_ref\":\"${payref}\",\"void_tx_ref\":\"${voidref}\"}" \
    "${BASE}/__void/operator/buy-void/queue/transition"
  echo
}

echo
echo "=== [4] transitions ==="
PAYMENT_SEEN_JSON="$(step payment_seen "payment observed on Base" "base_tx_seen_001" "")"
printf '%s\n' "$PAYMENT_SEEN_JSON"

PAYMENT_CONFIRMED_JSON="$(step payment_confirmed "payment confirmed on Base" "base_tx_confirmed_001" "")"
printf '%s\n' "$PAYMENT_CONFIRMED_JSON"

VOID_SENT_JSON="$(step void_sent "VOID sent to delivery wallet" "base_tx_confirmed_001" "void_tx_001")"
printf '%s\n' "$VOID_SENT_JSON"

COMPLETED_JSON="$(step completed "fulfillment completed" "base_tx_confirmed_001" "void_tx_001")"
printf '%s\n' "$COMPLETED_JSON"

echo
echo "=== [5] latest queue status ==="
STATUS_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/queue/status?queue_id=${QUEUE_ID}")"
printf '%s\n' "$STATUS_JSON"

echo
echo "=== [6] queued history ==="
HISTORY_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/queue?account=${ACCOUNT}&limit=20")"
printf '%s\n' "$HISTORY_JSON"

echo
echo "=== [7] assert lifecycle proof ==="
python3 - <<'PY' \
  "$CREATE_JSON" "$QUEUE_JSON" "$PAYMENT_SEEN_JSON" "$PAYMENT_CONFIRMED_JSON" "$VOID_SENT_JSON" "$COMPLETED_JSON" "$STATUS_JSON" "$HISTORY_JSON" "$ACCOUNT" "$WALLET" "$AMOUNT_USDC" "$OUT_JSON"
import json, sys
from pathlib import Path

create_json, queue_json, seen_json, confirmed_json, sent_json, completed_json, status_json, history_json, account, wallet, amount_usdc, out_json = sys.argv[1:13]
create = json.loads(create_json)
queued0 = json.loads(queue_json)
seen = json.loads(seen_json)
confirmed = json.loads(confirmed_json)
sent = json.loads(sent_json)
completed = json.loads(completed_json)
status = json.loads(status_json)
history = json.loads(history_json)

req = create.get("request") or {}
q0 = queued0.get("queued") or {}
q1 = seen.get("queued") or {}
q2 = confirmed.get("queued") or {}
q3 = sent.get("queued") or {}
q4 = completed.get("queued") or {}
qs = status.get("queued") or {}
hist = history.get("queued") or []

assert create.get("ok") is True, create
assert queued0.get("ok") is True, queued0
assert q0.get("operator_status") == "queued", q0
assert q0.get("account") == account, q0
assert q0.get("delivery_wallet") == wallet, q0
assert float(q0.get("requested_amount_usdc")) == float(amount_usdc), q0

assert seen.get("ok") is True and q1.get("operator_status") == "payment_seen", q1
assert confirmed.get("ok") is True and q2.get("operator_status") == "payment_confirmed", q2
assert sent.get("ok") is True and q3.get("operator_status") == "void_sent", q3
assert completed.get("ok") is True and q4.get("operator_status") == "completed", q4

assert q2.get("payment_ref") == "base_tx_confirmed_001", q2
assert q3.get("void_tx_ref") == "void_tx_001", q3
assert q4.get("payment_ref") == "base_tx_confirmed_001", q4
assert q4.get("void_tx_ref") == "void_tx_001", q4

assert status.get("ok") is True, status
assert qs.get("queue_id") == q0.get("queue_id"), qs
assert qs.get("operator_status") == "completed", qs

assert history.get("ok") is True, history
assert any((x.get("queue_id") == q0.get("queue_id") and x.get("operator_status") == "completed") for x in hist), history

report = {
    "ok": True,
    "request": req,
    "queued": q0,
    "payment_seen": q1,
    "payment_confirmed": q2,
    "void_sent": q3,
    "completed": q4,
    "latestStatus": qs,
    "historyCount": len(hist),
}
Path(out_json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
print(f"[ok] wrote {out_json}")
print("[ok] buy void operator lifecycle proof green")
PY

echo
echo "[ok] buy void operator lifecycle lane green"
