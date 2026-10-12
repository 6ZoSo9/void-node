#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

HTML="/tmp/participant-datanet-wc-status-ui-proof.html"
STATUS="/tmp/participant-datanet-wc-status-ui-proof.json"

echo "=== participant DataNet/WC status UI proof ==="
echo "mutation=false"
echo

echo "=== [1] source markers ==="
grep -q 'VOID_PARTICIPANT_DATANET_WC_STATUS_V1' src/index.ts
grep -q 'VOID_PARTICIPANT_DATANET_WC_STATUS_JS_V1' src/index.ts
grep -q 'VOID_PARTICIPANT_DATANET_WC_STATUS_CALL_V1' src/index.ts
grep -q '/__void/participant/datanet-wc/status?account=' src/index.ts
grep -q 'DataNet/WC useful work' src/index.ts
grep -q 'accepted DataNet receipts can credit WC' src/index.ts
echo "[ok] source UI markers present"
echo

echo "=== [2] build/restart/ready ==="
npm run build >/tmp/participant-datanet-wc-status-ui-build.log 2>&1
systemctl --user restart void-node.service
sleep 3
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/participant-datanet-wc-status-ui-ready.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/participant-datanet-wc-status-ui-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY
echo

echo "=== [3] served participant page has visible DataNet/WC status panel ==="
curl -fsS --max-time 8 http://127.0.0.1:4100/participant > "$HTML"
python3 - <<'PY'
from pathlib import Path
html = Path("/tmp/participant-datanet-wc-status-ui-proof.html").read_text(errors="replace")
checks = [
  "VOID_PARTICIPANT_DATANET_WC_STATUS_V1",
  "VOID_PARTICIPANT_DATANET_WC_STATUS_JS_V1",
  "VOID_PARTICIPANT_DATANET_WC_STATUS_CALL_V1",
  "DataNet/WC useful work",
  "Checking DataNet receipts and WC credit status",
  "Run Once submits approved useful work",
  "accepted DataNet receipts can credit WC",
  "/__void/participant/datanet-wc/status?account=",
]
missing = [c for c in checks if c not in html]
if missing:
    print("[ERR] missing served participant DataNet/WC UI copy:")
    for m in missing:
        print(" -", m)
    raise SystemExit(1)
print("[ok] served participant DataNet/WC UI present")
PY
echo

echo "=== [4] backing DataNet/WC route returns useful status ==="
curl -fsS --max-time 8 "http://127.0.0.1:4100/__void/participant/datanet-wc/status?account=zoso" > "$STATUS"
python3 - <<'PY'
import json
j=json.load(open("/tmp/participant-datanet-wc-status-ui-proof.json"))
assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("public_safe") is True, j
assert (j.get("datanet") or {}).get("canonical_api") == "/datanet/v1", j
assert int(((j.get("datanet") or {}).get("receipts") or {}).get("total") or 0) > 0, j
safety = j.get("safety") or {}
assert safety.get("useful_work_policy") == "useful_verifiable_only", j
assert safety.get("buy_void_fulfillment") is False, j
assert safety.get("validator_mutation") is False, j
assert safety.get("wallet_send") is False, j
assert safety.get("wc_to_void_swap") is False, j
print("[ok] backing DataNet/WC status route green")
PY
echo

echo "=== [5] functional backstop ==="
make datanet-wc-status-v1-proof
make mainnet0-status-smoke
echo

echo "=== [6] summary ==="
python3 - <<'PY'
summary = {
  "participant_datanet_wc_status_ui": "green",
  "visible_panel": True,
  "backing_route": "/__void/participant/datanet-wc/status",
  "canonical_datanet_useful_work_loop": "green",
  "participant_status_visible": True,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
  "wallet_send": False,
  "wc_to_void_swap": False,
}
print(summary)
PY

echo "[ok] participant DataNet/WC status UI proof passed"
