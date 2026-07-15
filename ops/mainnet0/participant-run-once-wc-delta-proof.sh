#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

ACCOUNT="run-once-delta-proof-$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/participant-run-once-wc-delta-proof-$ACCOUNT"
mkdir -p "$OUT"

echo "=== participant Run Once WC delta proof ==="
echo "account=$ACCOUNT"
echo "mutation=bounded_user_action_only"

grep -q 'wcRunnerTickBtn' src/index.ts
grep -q '/wc/runner/tick' src/index.ts
grep -q 'WC visible now' src/index.ts
grep -q 'Waiting for WC credit' src/index.ts

curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > "$OUT/ready.json"
python3 - "$OUT/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready")
PY

curl -fsS --max-time 8 -H 'content-type: application/json' \
  -X POST http://127.0.0.1:4100/wc/runner/set?dry=0&confirm=wcRunnerSet \
  --data "{\"account\":\"$ACCOUNT\",\"enabled\":true}" > "$OUT/set.json"

curl -fsS --max-time 8 "http://127.0.0.1:4100/wc/redeemable?account=$ACCOUNT" > "$OUT/before.json"

curl -fsS --max-time 30 -H 'content-type: application/json' \
  -X POST http://127.0.0.1:4100/wc/runner/tick?dry=0&confirm=wcRunnerTick \
  --data "{\"account\":\"$ACCOUNT\"}" > "$OUT/tick.json"

curl -fsS --max-time 20 -H 'content-type: application/json' \
  -X POST "http://127.0.0.1:4100/wc/scan-receipts?dry=0&confirm=wcScanReceipts" \
  --data '{}' > "$OUT/scan.json"

sleep 2
curl -fsS --max-time 8 "http://127.0.0.1:4100/wc/redeemable?account=$ACCOUNT" > "$OUT/after.json"

curl -fsS --max-time 8 "http://127.0.0.1:4100/__void/participant/datanet-wc/status?account=$ACCOUNT" > "$OUT/status.json"

python3 - "$OUT" <<'PY'
import json, pathlib, sys
out=pathlib.Path(sys.argv[1])
before=json.load(open(out/"before.json"))
after=json.load(open(out/"after.json"))
tick=json.load(open(out/"tick.json"))
status=json.load(open(out/"status.json"))

b=int(before.get("redeemable") or 0)
a=int(after.get("redeemable") or 0)
assert tick.get("ok") is True, tick
assert a > b, {"before": b, "after": a}

blob=json.dumps(tick)
assert "datanet_publish" in blob, tick
assert "receipt_auto_credit" in blob, tick
assert "useful_verifiable_only" in blob, tick

safety=status.get("safety") or {}
assert status.get("ok") is True, status
assert safety.get("buy_void_fulfillment") is False, status
assert safety.get("validator_mutation") is False, status
assert safety.get("wallet_send") is False, status
assert safety.get("wc_to_void_swap") is False, status

print({
  "participant_run_once_wc_delta_v1": "green",
  "before": b,
  "after": a,
  "delta": a-b,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
  "wallet_send": False,
  "wc_to_void_swap": False,
})
PY

make mainnet0-status-smoke >/tmp/participant-run-once-wc-delta-smoke.log 2>&1
echo "[ok] participant Run Once WC delta proof passed"
