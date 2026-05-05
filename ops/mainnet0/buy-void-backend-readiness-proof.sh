#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
TMP="${TMP:-/tmp/void-buy-readiness}"
mkdir -p "$TMP"

echo "=== Buy VOID backend readiness proof ==="
echo "base=$BASE"
echo "account=$ACCOUNT"

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] build ==="
npm run build

echo
echo "=== [3] ready ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready.json"
cat "$TMP/ready.json"; echo

echo
echo "=== [4] read-only endpoint fetches ==="
curl -fsS "$BASE/__void/operator/buy-void/base-watcher/status" > "$TMP/watcher.json"
curl -fsS "$BASE/__void/operator/buy-void/queue?account=${ACCOUNT}&limit=20" > "$TMP/queue.json"
curl -fsS "$BASE/__void/participant/buy-void/latest?account=${ACCOUNT}" > "$TMP/draft.json"
curl -fsS "$BASE/__void/operator/buy-void/queue/latest?account=${ACCOUNT}" > "$TMP/latest-queue.json"
curl -fsS "$BASE/__void/operator/buy-void/watch-targets?account=${ACCOUNT}&limit=20" > "$TMP/watches.json"
curl -fsS "$BASE/__void/operator/buy-void/base-watcher/observations?limit=20" > "$TMP/observations.json"

echo "[ok] fetched watcher, queue, draft, latest queue, watches, observations"

echo
echo "=== [5] assert fail-closed readiness ==="
python3 - "$TMP" <<'PY'
import json, re, sys
from pathlib import Path

tmp = Path(sys.argv[1])

def load(name):
    return json.loads((tmp / name).read_text())

def evm(x):
    return bool(re.fullmatch(r"0x[a-fA-F0-9]{40}", str(x or "")))

ready = load("ready.json")
watcher = load("watcher.json")
queue = load("queue.json")
draft = load("draft.json")
latest_queue = load("latest-queue.json")
watches = load("watches.json")
observations = load("observations.json")

assert ready.get("ready") is True, ready
assert int(ready.get("gap", 999999)) == 0, ready
assert int(ready.get("txroot_live", 0)) == 1, ready

assert watcher.get("ok") is True, watcher
cfg = watcher.get("config") or {}
assert cfg.get("enabled") is True, cfg
assert cfg.get("mode") == "artifact_worker", cfg
assert cfg.get("chain") == "base", cfg
assert cfg.get("asset") == "base_native_usdc", cfg
assert evm(cfg.get("receiver_address")), cfg
assert str(cfg.get("rpc_url", "")).startswith("https://"), cfg
assert evm(cfg.get("token_address")), cfg
assert int(cfg.get("token_decimals")) == 6, cfg
assert int(cfg.get("confirmations_required")) >= 1, cfg

assert queue.get("ok") is True, queue
assert isinstance(queue.get("queued"), list), queue

assert draft.get("ok") is True, draft
req = draft.get("request")
if req:
    assert req.get("fulfillment_lane") == "buy_void_base_usdc_v1_future", req
    pol = req.get("policy") or {}
    assert pol.get("accepted_asset") == "base_native_usdc", pol
    assert pol.get("participant_page_only") is True, pol
    assert pol.get("blind_direct_deposits_blocked") is True, pol
    assert pol.get("exchange_or_custodial_wallet_sends_blocked") is True, pol

assert latest_queue.get("ok") is True, latest_queue
q = latest_queue.get("queued")
if q:
    assert q.get("fulfillment_lane") == "buy_void_base_usdc_v1_future", q
    assert evm(q.get("delivery_wallet")), q
    assert float(q.get("requested_amount_usdc") or 0) > 0, q
    assert str(q.get("operator_status") or "") in {
        "queued", "payment_seen", "payment_confirmed", "void_sent", "completed", "failed"
    }, q

assert watches.get("ok") is True, watches
assert observations.get("ok") is True, observations

print("[ok] Buy VOID backend readiness is read-only and fail-closed")
print("[ok] No mutating endpoints were called by this proof")
PY

echo
echo "[ok] Buy VOID backend readiness proof passed"
