#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_USDC="${AMOUNT_USDC:-25}"
OUT_JSON="${OUT_JSON:-/tmp/buy-void-operator-queue-proof.$(date +%Y%m%d-%H%M%S).json}"

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
if [ -z "$REQUEST_ID" ]; then
  echo "[ERR] failed to create request draft"
  exit 1
fi

echo
echo "=== [3] read operator draft view ==="
DRAFTS_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/drafts?account=${ACCOUNT}&limit=5")"
printf '%s\n' "$DRAFTS_JSON"

echo
echo "=== [4] queue the request draft for operator fulfillment ==="
QUEUE_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"request_id\":\"${REQUEST_ID}\",\"operator_note\":\"participant draft accepted into operator queue\"}" \
  "${BASE}/__void/operator/buy-void/queue")"
printf '%s\n' "$QUEUE_JSON"

echo
echo "=== [5] read latest queued item ==="
LATEST_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/queue/latest?account=${ACCOUNT}")"
printf '%s\n' "$LATEST_JSON"

echo
echo "=== [6] read queued history ==="
HISTORY_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/queue?account=${ACCOUNT}&limit=5")"
printf '%s\n' "$HISTORY_JSON"

echo
echo "=== [7] assert proof ==="
python3 - <<'PY' "$CREATE_JSON" "$DRAFTS_JSON" "$QUEUE_JSON" "$LATEST_JSON" "$HISTORY_JSON" "$ACCOUNT" "$WALLET" "$AMOUNT_USDC" "$OUT_JSON"
import json, sys
from pathlib import Path

create_json, drafts_json, queue_json, latest_json, history_json, account, wallet, amount_usdc, out_json = sys.argv[1:10]
create = json.loads(create_json)
drafts = json.loads(drafts_json)
queue = json.loads(queue_json)
latest = json.loads(latest_json)
history = json.loads(history_json)

req = create.get("request") or {}
queued = queue.get("queued") or {}
latest_q = latest.get("queued") or {}
hist = history.get("queued") or []

assert create.get("ok") is True, create
assert req.get("request_id"), req
assert req.get("account") == account, req
assert req.get("delivery_wallet") == wallet, req
assert float(req.get("requested_amount_usdc")) == float(amount_usdc), req
assert req.get("status") == "draft_ready", req

assert drafts.get("ok") is True, drafts
assert any((x.get("request_id") == req.get("request_id")) for x in (drafts.get("drafts") or [])), drafts

assert queue.get("ok") is True, queue
assert queued.get("request_id") == req.get("request_id"), queued
assert queued.get("account") == account, queued
assert queued.get("delivery_wallet") == wallet, queued
assert float(queued.get("requested_amount_usdc")) == float(amount_usdc), queued
assert queued.get("operator_status") == "queued", queued

assert latest.get("ok") is True, latest
assert latest_q.get("request_id") == req.get("request_id"), latest_q

assert history.get("ok") is True, history
assert any((x.get("request_id") == req.get("request_id")) for x in hist), history

report = {
    "ok": True,
    "request": req,
    "queued": queued,
    "latestQueued": latest_q,
    "historyCount": len(hist),
}
Path(out_json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
print(f"[ok] wrote {out_json}")
print("[ok] buy void operator queue proof green")
PY

echo
echo "[ok] buy void operator queue lane green"
