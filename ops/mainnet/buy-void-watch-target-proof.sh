#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_USDC="${AMOUNT_USDC:-25}"
OUT_JSON="${OUT_JSON:-/tmp/buy-void-watch-target-proof.$(date +%Y%m%d-%H%M%S).json}"

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
  -d "{\"request_id\":\"${REQUEST_ID}\",\"operator_note\":\"queued for watch target proof\"}" \
  "${BASE}/__void/operator/buy-void/queue")"
printf '%s\n' "$QUEUE_JSON"

QUEUE_ID="$(printf '%s\n' "$QUEUE_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("queued") or {}).get("queue_id",""))')"

echo
echo "=== [4] create watch target ==="
WATCH_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"queue_id\":\"${QUEUE_ID}\",\"operator_note\":\"watch target created for Base USDC payment\"}" \
  "${BASE}/__void/operator/buy-void/watch-targets")"
printf '%s\n' "$WATCH_JSON"

WATCH_ID="$(printf '%s\n' "$WATCH_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("watch") or {}).get("watch_id",""))')"

echo
echo "=== [5] latest watch target ==="
LATEST_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/watch-targets/latest?account=${ACCOUNT}")"
printf '%s\n' "$LATEST_JSON"

echo
echo "=== [6] watch target status ==="
STATUS_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/watch-targets/status?watch_id=${WATCH_ID}")"
printf '%s\n' "$STATUS_JSON"

echo
echo "=== [7] watch target history ==="
HISTORY_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/watch-targets?account=${ACCOUNT}&limit=10")"
printf '%s\n' "$HISTORY_JSON"

echo
echo "=== [8] assert proof ==="
python3 - <<'PY' \
  "$CREATE_JSON" "$QUEUE_JSON" "$WATCH_JSON" "$LATEST_JSON" "$STATUS_JSON" "$HISTORY_JSON" "$ACCOUNT" "$WALLET" "$AMOUNT_USDC" "$OUT_JSON"
import json, sys
from pathlib import Path

create_json, queue_json, watch_json, latest_json, status_json, history_json, account, wallet, amount_usdc, out_json = sys.argv[1:11]
create = json.loads(create_json)
queued = json.loads(queue_json)
watch = json.loads(watch_json)
latest = json.loads(latest_json)
status = json.loads(status_json)
history = json.loads(history_json)

req = create.get("request") or {}
q = queued.get("queued") or {}
w = watch.get("watch") or {}
lw = latest.get("watch") or {}
sw = status.get("watch") or {}
hist = history.get("watches") or []

assert create.get("ok") is True, create
assert req.get("status") == "draft_ready", req

assert queued.get("ok") is True, queued
assert q.get("operator_status") == "queued", q

assert watch.get("ok") is True, watch
assert w.get("queue_id") == q.get("queue_id"), w
assert w.get("request_id") == req.get("request_id"), w
assert w.get("account") == account, w
assert w.get("delivery_wallet") == wallet, w
assert float(w.get("requested_amount_usdc")) == float(amount_usdc), w
assert w.get("expected_asset") == "base_native_usdc", w
assert w.get("expected_chain") == "base", w
assert w.get("source_operator_status") == "queued", w
assert w.get("watch_status") == "watch_target_created", w

assert latest.get("ok") is True, latest
assert lw.get("watch_id") == w.get("watch_id"), lw

assert status.get("ok") is True, status
assert sw.get("watch_id") == w.get("watch_id"), sw

assert history.get("ok") is True, history
assert any((x.get("watch_id") == w.get("watch_id")) for x in hist), history

report = {
    "ok": True,
    "request": req,
    "queued": q,
    "watch": w,
    "latestWatch": lw,
    "statusWatch": sw,
    "historyCount": len(hist),
}
Path(out_json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
print(f"[ok] wrote {out_json}")
print("[ok] buy void watch-target proof green")
PY

echo
echo "[ok] buy void watch-target lane green"
