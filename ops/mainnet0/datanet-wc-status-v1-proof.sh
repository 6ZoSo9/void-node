#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

STATUS_JSON="/tmp/datanet-wc-status-v1.json"
PART_JSON="/tmp/participant-datanet-wc-status-v1.json"

echo "=== DataNet/WC participant status v1 proof ==="
echo "mutation=false"
echo

echo "=== [1] source markers ==="
grep -q 'DataNetWcParticipantStatusV1' src/index.ts
grep -q '/__void/datanet/status' src/index.ts
grep -q '/__void/participant/datanet-wc/status' src/index.ts
grep -q 'useful_verifiable_only' src/index.ts
grep -q 'buy_void_fulfillment: false' src/index.ts
grep -q 'validator_mutation: false' src/index.ts
echo "[ok] source route markers present"
echo

echo "=== [2] build/restart/ready ==="
npm run build >/tmp/datanet-wc-status-v1-build.log 2>&1
systemctl --user restart void-node.service
sleep 3
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/datanet-wc-status-ready.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/datanet-wc-status-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY
echo

echo "=== [3] status routes return useful functional data ==="
curl -fsS --max-time 8 "http://127.0.0.1:4100/__void/datanet/status?account=zoso" > "$STATUS_JSON"
curl -fsS --max-time 8 "http://127.0.0.1:4100/__void/participant/datanet-wc/status?account=zoso" > "$PART_JSON"

python3 - <<'PY'
import json

for file in ["/tmp/datanet-wc-status-v1.json", "/tmp/participant-datanet-wc-status-v1.json"]:
    j=json.load(open(file))
    assert j.get("ok") is True, j
    assert j.get("mutation") is False, j
    assert j.get("public_safe") is True, j

    dn=j.get("datanet") or {}
    assert dn.get("canonical_api") == "/datanet/v1", j
    assert dn.get("publish_path") == "/datanet/v1/publish", j
    assert dn.get("fetch_path") == "/datanet/v1/fetch", j

    receipts=dn.get("receipts") or {}
    assert receipts.get("exists") is True, j
    assert int(receipts.get("total") or 0) > 0, j

    wc=j.get("wc") or {}
    assert wc.get("redeemable_path") == "/wc/redeemable?account=zoso", j
    assert wc.get("runner_status_path") == "/wc/runner/status?account=zoso", j

    safety=j.get("safety") or {}
    assert safety.get("useful_work_policy") == "useful_verifiable_only", j
    assert safety.get("buy_void_fulfillment") is False, j
    assert safety.get("validator_mutation") is False, j
    assert safety.get("wallet_send") is False, j
    assert safety.get("wc_to_void_swap") is False, j

print("[ok] DataNet/WC status routes functional")
PY
echo

echo "=== [4] canonical useful-work loop still credits WC ==="
bash ops/datanet-canonical-proof.sh >/tmp/datanet-wc-status-v1-canonical.log 2>&1
grep -q 'canonical_datanet_useful_work_loop_ok=1' /tmp/datanet-wc-status-v1-canonical.log
grep -q 'credit_delta=1' /tmp/datanet-wc-status-v1-canonical.log
tail -n 60 /tmp/datanet-wc-status-v1-canonical.log
echo

echo "=== [5] participant WC/runner status still reachable ==="
curl -fsS --max-time 8 "http://127.0.0.1:4100/wc/redeemable?account=zoso" > /tmp/datanet-wc-status-v1-redeemable.json
curl -fsS --max-time 8 "http://127.0.0.1:4100/wc/runner/status?account=zoso" > /tmp/datanet-wc-status-v1-runner.json
python3 - <<'PY'
import json
redeem=json.load(open("/tmp/datanet-wc-status-v1-redeemable.json"))
runner=json.load(open("/tmp/datanet-wc-status-v1-runner.json"))
assert redeem.get("ok") is True, redeem
assert runner.get("ok") is True, runner
assert runner.get("enabled") is True, runner
assert runner.get("manual_only") is True, runner
assert runner.get("active_task_class") == "datanet_publish", runner
print("[ok] WC redeemable and runner status reachable")
PY
echo

echo "=== [6] public-safe status smoke ==="
make mainnet0-status-smoke
echo

echo "=== [7] summary ==="
python3 - <<'PY'
summary = {
  "datanet_wc_status_v1": "green",
  "routes": ["/__void/datanet/status", "/__void/participant/datanet-wc/status"],
  "canonical_datanet_useful_work_loop": "green",
  "wc_credit_delta_proven": 1,
  "participant_status_visible": True,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
  "wallet_send": False,
  "wc_to_void_swap": False,
}
print(summary)
PY

echo "[ok] DataNet/WC participant status v1 proof passed"
