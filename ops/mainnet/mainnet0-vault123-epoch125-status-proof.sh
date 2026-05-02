#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
RPC="${RPC:-http://127.0.0.1:8545}"

echo "=== Mainnet-0 vault123 epoch125 status proof ==="

STAKING="$(python3 -c 'import json; print(json.load(open("ops/mainnet/validator-truth-upgrade-track.deployed.json"))["contracts"]["staking"])')"

VC="$(cast call "$STAKING" 'getValidatorCount()(uint256)' --rpc-url "$RPC" | awk '{print $1}')"
AC="$(cast call "$STAKING" 'getActiveValidatorCount()(uint256)' --rpc-url "$RPC" | awk '{print $1}')"

echo "staking=$STAKING"
echo "validator_count=$VC"
echo "active_count=$AC"

test "$VC" = "124"
test "$AC" = "124"

READY="$(curl -fsS "$BASE/__void/ready.json")"
echo "$READY"
READY_JSON="$READY" python3 - <<'PY'
import json, os
j=json.loads(os.environ["READY_JSON"])
assert j["ready"] is True
assert int(j["gap"]) == 0
assert int(j["txroot_live"]) == 1
PY

STATUS="$(curl -fsS "$BASE/__void/runtime/validator-truth/status")"
STATUS_JSON="$STATUS" python3 - <<'PY'
import json, os
j=json.loads(os.environ["STATUS_JSON"])
print("latestEpoch="+str(j.get("latestEpoch")))
assert int(j["latestEpoch"]) == 125
PY

EPOCH="$(curl -fsS "$BASE/__void/runtime/validator-truth/epoch/125")"
EPOCH_JSON="$EPOCH" python3 - <<'PY'
import json, os
j=json.loads(os.environ["EPOCH_JSON"])
s=j["summary"]
print("epoch="+str(s.get("epoch")))
print("validatorCount="+str(s.get("validatorCount")))
print("totalPower="+str(s.get("totalPower")))
print("published="+str(s.get("published")))
print("publishedMatch="+str(s.get("publishedMatch")))
assert int(s["epoch"]) == 125
assert int(s["validatorCount"]) == 124
assert str(s["totalPower"]) == "124000000000000000000000"
assert s["published"] is True
assert s["publishedMatch"] is True
PY

NEXT="$(curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard")"
NEXT_JSON="$NEXT" python3 - <<'PY'
import json, os
j=json.loads(os.environ["NEXT_JSON"])
print("selectedCandidateName="+str(j.get("selectedCandidateName")))
print("currentEpoch="+str(j.get("currentEpoch")))
print("targetEpoch="+str(j.get("targetEpoch")))
print("currentValidatorCount="+str(j.get("currentValidatorCount")))
print("expectedValidatorCount="+str(j.get("expectedValidatorCount")))
assert j["selectedCandidateName"] == "vault124"
assert int(j["currentEpoch"]) == 125
assert int(j["targetEpoch"]) == 126
assert int(j["currentValidatorCount"]) == 124
assert int(j["expectedValidatorCount"]) == 125
PY

echo "[ok] vault123 admitted and epoch125 runtime truth green"
