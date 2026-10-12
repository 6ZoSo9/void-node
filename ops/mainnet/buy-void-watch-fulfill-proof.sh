#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_USDC="${AMOUNT_USDC:-25}"
OUT_JSON="${OUT_JSON:-/tmp/buy-void-watch-fulfill-proof.$(date +%Y%m%d-%H%M%S).json}"

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
  -d "{\"request_id\":\"${REQUEST_ID}\",\"operator_note\":\"queued for watch fulfill proof\"}" \
  "${BASE}/__void/operator/buy-void/queue")"
printf '%s\n' "$QUEUE_JSON"

QUEUE_ID="$(printf '%s\n' "$QUEUE_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("queued") or {}).get("queue_id",""))')"

echo
echo "=== [4] create watch target ==="
WATCH_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"queue_id\":\"${QUEUE_ID}\",\"operator_note\":\"watch target created for fulfill proof\"}" \
  "${BASE}/__void/operator/buy-void/watch-targets")"
printf '%s\n' "$WATCH_JSON"

WATCH_ID="$(printf '%s\n' "$WATCH_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("watch") or {}).get("watch_id",""))')"

echo
echo "=== [5] record payment_confirmed observation ==="
CONFIRMED_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"watch_id\":\"${WATCH_ID}\",\"observe_status\":\"payment_confirmed\",\"observed_amount_usdc\":\"${AMOUNT_USDC}\",\"payment_ref\":\"base_tx_confirmed_manual_002\",\"operator_note\":\"manual payment_confirmed observation for fulfill proof\"}" \
  "${BASE}/__void/operator/buy-void/watch-targets/observe")"
printf '%s\n' "$CONFIRMED_JSON"

echo
echo "=== [6] record manual fulfill complete ==="
FULFILL_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"watch_id\":\"${WATCH_ID}\",\"fulfill_status\":\"completed\",\"void_tx_ref\":\"void_tx_manual_002\",\"operator_note\":\"manual fulfill complete\"}" \
  "${BASE}/__void/operator/buy-void/watch-targets/fulfill")"
printf '%s\n' "$FULFILL_JSON"

echo
echo "=== [7] latest watch target ==="
LATEST_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/watch-targets/latest?account=${ACCOUNT}")"
printf '%s\n' "$LATEST_JSON"

echo
echo "=== [8] watch target status ==="
STATUS_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/watch-targets/status?watch_id=${WATCH_ID}")"
printf '%s\n' "$STATUS_JSON"

echo
echo "=== [9] queue status ==="
QUEUE_STATUS_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/queue/status?queue_id=${QUEUE_ID}")"
printf '%s\n' "$QUEUE_STATUS_JSON"

echo
echo "=== [10] assert proof ==="
python3 - <<'PY' \
  "$CREATE_JSON" "$QUEUE_JSON" "$WATCH_JSON" "$CONFIRMED_JSON" "$FULFILL_JSON" "$LATEST_JSON" "$STATUS_JSON" "$QUEUE_STATUS_JSON" "$ACCOUNT" "$WALLET" "$AMOUNT_USDC" "$OUT_JSON"
import json, sys
from pathlib import Path

create_json, queue_json, watch_json, confirmed_json, fulfill_json, latest_json, status_json, queue_status_json, account, wallet, amount_usdc, out_json = sys.argv[1:13]
create = json.loads(create_json)
queued = json.loads(queue_json)
watch = json.loads(watch_json)
confirmed = json.loads(confirmed_json)
fulfill = json.loads(fulfill_json)
latest = json.loads(latest_json)
status = json.loads(status_json)
queue_status = json.loads(queue_status_json)

req = create.get("request") or {}
q = queued.get("queued") or {}
w0 = watch.get("watch") or {}
w1 = confirmed.get("watch") or {}
w2 = fulfill.get("watch") or {}
lw = latest.get("watch") or {}
sw = status.get("watch") or {}
qs = queue_status.get("queued") or {}
queue_updates_1 = confirmed.get("queue_updates") or []
queue_updates_2 = fulfill.get("queue_updates") or []

assert create.get("ok") is True, create
assert queued.get("ok") is True, queued
assert watch.get("ok") is True, watch

assert w1.get("watch_status") == "payment_confirmed_recorded", w1
assert w1.get("payment_ref") == "base_tx_confirmed_manual_002", w1
assert len(queue_updates_1) >= 1, confirmed
assert queue_updates_1[-1].get("operator_status") == "payment_confirmed", queue_updates_1

assert fulfill.get("ok") is True, fulfill
assert w2.get("watch_status") == "completed_recorded", w2
assert w2.get("void_tx_ref") == "void_tx_manual_002", w2
assert len(queue_updates_2) >= 1, fulfill
assert queue_updates_2[-1].get("operator_status") == "completed", queue_updates_2
assert any((x.get("operator_status") == "void_sent") for x in queue_updates_2), queue_updates_2

assert latest.get("ok") is True and lw.get("watch_id") == w0.get("watch_id"), latest
assert status.get("ok") is True and sw.get("watch_id") == w0.get("watch_id"), status
assert sw.get("watch_status") == "completed_recorded", sw
assert sw.get("void_tx_ref") == "void_tx_manual_002", sw

assert queue_status.get("ok") is True, queue_status
assert qs.get("queue_id") == q.get("queue_id"), qs
assert qs.get("operator_status") == "completed", qs
assert qs.get("payment_ref") == "base_tx_confirmed_manual_002", qs
assert qs.get("void_tx_ref") == "void_tx_manual_002", qs

report = {
    "ok": True,
    "request": req,
    "queued": q,
    "watch_created": w0,
    "watch_confirmed": w1,
    "watch_completed": w2,
    "latestWatch": lw,
    "statusWatch": sw,
    "queueStatus": qs,
}
Path(out_json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
print(f"[ok] wrote {out_json}")
print("[ok] buy void watch fulfill proof green")
PY

echo
echo "[ok] buy void watch fulfill lane green"
