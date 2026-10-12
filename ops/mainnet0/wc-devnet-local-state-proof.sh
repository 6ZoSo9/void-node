#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HELPER="${HELPER:-http://127.0.0.1:4312}"
RELAYER="${RELAYER:-http://127.0.0.1:4313}"

STATE_ROOT="${WC_LOCAL_STATE_ROOT:-$PWD/.runtime/mainnet0/wc-devnet-local/current}"
STATE_JSON="${STATE_JSON:-$STATE_ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
STATE_FILE="${STATE_FILE:-$STATE_ROOT/docs/VOID-WORKCREDITS-DEVNET-STATE.json}"
BCAST_FILE="${BCAST_FILE:-$STATE_ROOT/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json}"

echo "=== WC devnet local state proof ==="

echo
echo "=== [1] local runtime state files exist ==="
test -f "$STATE_JSON"
test -f "$STATE_FILE"
test -f "$BCAST_FILE"
echo "STATE_JSON=$STATE_JSON"
echo "STATE_FILE=$STATE_FILE"
echo "BCAST_FILE=$BCAST_FILE"

echo
echo "=== [2] tracked WC state files are not dirty ==="
git diff --quiet -- \
  broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json \
  config/void-workcredits-devnet.live.json \
  docs/VOID-DEVNET-PROTOCOL-STATE.json \
  docs/VOID-WORKCREDITS-DEVNET-STATE.json
echo "[ok] tracked WC state files clean"

echo
echo "=== [3] helper pool matches local runtime state ==="
curl -fsS "$HELPER/workcredits/devnet/pool.json" | tee /tmp/void-wc-local-state-helper.json
python3 - "$STATE_JSON" "$STATE_FILE" /tmp/void-wc-local-state-helper.json <<'PY'
import json, sys
proto=json.load(open(sys.argv[1]))
wc=json.load(open(sys.argv[2]))
helper=json.load(open(sys.argv[3]))
assert helper.get("up") == 1, helper
assert helper.get("health") == 1, helper
assert helper["pool"]["address"].lower() == wc["pool_address"].lower(), (helper, wc)
assert helper["pool"]["address"].lower() == proto["workCreditsPoolV1"].lower(), (helper, proto)
print("[ok] helper pool matches local runtime state")
PY

echo
echo "=== [4] relayer health matches local runtime state ==="
curl -fsS "$RELAYER/api/wc-relayer/v1/health" | tee /tmp/void-wc-local-state-relayer.json
python3 - "$STATE_JSON" /tmp/void-wc-local-state-relayer.json <<'PY'
import json, sys
proto=json.load(open(sys.argv[1]))
rel=json.load(open(sys.argv[2]))
assert rel.get("ok") is True, rel
assert rel.get("helper_up") is True, rel
assert rel["pool"].lower() == proto["workCreditsPoolV1"].lower(), (rel, proto)
assert rel["wc_token"].lower() == proto["workCreditsToken"].lower(), (rel, proto)
assert rel["void_token"].lower() == proto["voidToken"].lower(), (rel, proto)
print("[ok] relayer matches local runtime state")
PY

echo
echo "=== [5] node ready remains green ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-wc-local-state-ready.json
python3 - /tmp/void-wc-local-state-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] node ready/gap/txroot")
PY

echo
echo "[ok] WC devnet local state proof passed"
