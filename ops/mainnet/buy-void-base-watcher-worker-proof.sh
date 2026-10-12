#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_USDC="${AMOUNT_USDC:-25}"
OUT_JSON="${OUT_JSON:-/tmp/buy-void-base-watcher-worker-proof.$(date +%Y%m%d-%H%M%S).json}"

echo "=== [1] participant wallet truth ==="
WALLET="$(curl -fsS "${BASE}/__void/participant/wallet/status?account=${ACCOUNT}" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("address","") if j.get("ok") and j.get("has_wallet") else "")')"
echo "wallet=${WALLET}"

if [ -z "$WALLET" ]; then
  echo "[ERR] no execution wallet mapped for account ${ACCOUNT}"
  exit 1
fi

echo
echo "=== [2] configure base watcher worker ==="
CFG_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d '{"enabled":true,"mode":"artifact_worker","chain":"base","asset":"base_native_usdc","receiver_address":"base_receiver_stub_001"}' \
  "${BASE}/__void/operator/buy-void/base-watcher/config")"
printf '%s\n' "$CFG_JSON"

echo
echo "=== [3] create participant request draft ==="
CREATE_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"account\":\"${ACCOUNT}\",\"delivery_wallet\":\"${WALLET}\",\"requested_amount_usdc\":\"${AMOUNT_USDC}\"}" \
  "${BASE}/__void/participant/buy-void/request")"
printf '%s\n' "$CREATE_JSON"

REQUEST_ID="$(printf '%s\n' "$CREATE_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("request") or {}).get("request_id",""))')"

echo
echo "=== [4] queue request ==="
QUEUE_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"request_id\":\"${REQUEST_ID}\",\"operator_note\":\"queued for base watcher worker proof\"}" \
  "${BASE}/__void/operator/buy-void/queue")"
printf '%s\n' "$QUEUE_JSON"

QUEUE_ID="$(printf '%s\n' "$QUEUE_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("queued") or {}).get("queue_id",""))')"

echo
echo "=== [5] create watch target ==="
WATCH_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"queue_id\":\"${QUEUE_ID}\",\"operator_note\":\"watch target created for base watcher worker proof\"}" \
  "${BASE}/__void/operator/buy-void/watch-targets")"
printf '%s\n' "$WATCH_JSON"

WATCH_ID="$(printf '%s\n' "$WATCH_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("watch") or {}).get("watch_id",""))')"

echo
echo "=== [6] ingest confirmed Base observation ==="
OBS_JSON="$(curl -fsS \
  -H 'content-type: application/json' \
  -d "{\"payment_tag\":\"${REQUEST_ID}\",\"payment_ref\":\"base_tx_worker_001\",\"observed_status\":\"payment_confirmed\",\"observed_amount_usdc\":\"${AMOUNT_USDC}\",\"receiver_address\":\"base_receiver_stub_001\",\"operator_note\":\"base watcher worker proof observation\"}" \
  "${BASE}/__void/operator/buy-void/base-watcher/observations")"
printf '%s\n' "$OBS_JSON"

echo
echo "=== [7] run watcher once ==="
RUN_JSON="$(curl -fsS -H 'content-type: application/json' -d '{}' "${BASE}/__void/operator/buy-void/base-watcher/run-once")"
printf '%s\n' "$RUN_JSON"

echo
echo "=== [8] latest watch target ==="
LATEST_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/watch-targets/latest?account=${ACCOUNT}")"
printf '%s\n' "$LATEST_JSON"

echo
echo "=== [9] queue status ==="
QUEUE_STATUS_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/queue/status?queue_id=${QUEUE_ID}")"
printf '%s\n' "$QUEUE_STATUS_JSON"

echo
echo "=== [10] watcher status ==="
STATUS_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/base-watcher/status")"
printf '%s\n' "$STATUS_JSON"

echo
echo "=== [11] assert proof ==="
python3 - <<'PY' \
  "$CFG_JSON" "$CREATE_JSON" "$QUEUE_JSON" "$WATCH_JSON" "$OBS_JSON" "$RUN_JSON" "$LATEST_JSON" "$QUEUE_STATUS_JSON" "$STATUS_JSON" "$ACCOUNT" "$WALLET" "$AMOUNT_USDC" "$OUT_JSON"
import json, sys
from pathlib import Path

cfg_json, create_json, queue_json, watch_json, obs_json, run_json, latest_json, queue_status_json, status_json, account, wallet, amount_usdc, out_json = sys.argv[1:14]
cfg = json.loads(cfg_json)
create = json.loads(create_json)
queued = json.loads(queue_json)
watch = json.loads(watch_json)
obs = json.loads(obs_json)
run = json.loads(run_json)
latest = json.loads(latest_json)
queue_status = json.loads(queue_status_json)
status = json.loads(status_json)

cfgv = cfg.get("config") or {}
req = create.get("request") or {}
q = queued.get("queued") or {}
w = watch.get("watch") or {}
o = obs.get("observation") or {}
lw = latest.get("watch") or {}
qs = queue_status.get("queued") or {}
st = status or {}
processed = run.get("processed") or []

assert cfg.get("ok") is True, cfg
assert cfgv.get("enabled") is True, cfgv
assert cfgv.get("mode") == "artifact_worker", cfgv
assert cfgv.get("chain") == "base", cfgv
assert cfgv.get("asset") == "base_native_usdc", cfgv
assert cfgv.get("receiver_address") == "base_receiver_stub_001", cfgv

assert create.get("ok") is True, create
assert queued.get("ok") is True, queued
assert watch.get("ok") is True, watch
assert w.get("payment_tag") == req.get("request_id"), w
assert w.get("expected_chain") == "base", w
assert w.get("expected_asset") == "base_native_usdc", w

assert obs.get("ok") is True, obs
assert o.get("payment_tag") == req.get("request_id"), o
assert o.get("payment_ref") == "base_tx_worker_001", o
assert float(o.get("observed_amount_usdc")) == float(amount_usdc), o
assert o.get("observed_status") == "payment_confirmed", o

assert run.get("ok") is True, run
assert run.get("processed_count", 0) >= 1, run
assert any((x.get("watch_id") == w.get("watch_id")) for x in processed), run

assert latest.get("ok") is True, latest
assert lw.get("watch_id") == w.get("watch_id"), lw
assert lw.get("watch_status") == "payment_confirmed_recorded", lw
assert lw.get("payment_ref") == "base_tx_worker_001", lw
assert float(lw.get("observed_amount_usdc")) == float(amount_usdc), lw

assert queue_status.get("ok") is True, queue_status
assert qs.get("queue_id") == q.get("queue_id"), qs
assert qs.get("operator_status") == "payment_confirmed", qs
assert qs.get("payment_ref") == "base_tx_worker_001", qs

assert st.get("ok") is True, st
assert (st.get("config") or {}).get("enabled") is True, st
assert (st.get("config") or {}).get("mode") == "artifact_worker", st
assert (st.get("latest_watch") or {}).get("watch_id") == w.get("watch_id"), st
assert (st.get("latest_watch") or {}).get("watch_status") == "payment_confirmed_recorded", st

report = {
    "ok": True,
    "config": cfgv,
    "request": req,
    "queued": q,
    "watch_created": w,
    "observation": o,
    "worker_run": run,
    "latest_watch": lw,
    "queue_status": qs,
    "watcher_status": st,
}
Path(out_json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
print(f"[ok] wrote {out_json}")
print("[ok] buy void base watcher worker proof green")
PY

echo
echo "[ok] buy void base watcher worker lane green"
