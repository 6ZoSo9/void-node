#!/usr/bin/env bash
set -euo pipefail

cd "${VOID_REPO:-$HOME/dev/void-node}"

RPC="${RPC:-http://127.0.0.1:8545}"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 8545 epoch125 state proof ==="
echo "rpc=$RPC"
echo "base=$BASE"

CHAIN_ID="$(cast chain-id --rpc-url "$RPC")"
echo "chain_id=$CHAIN_ID"
test "$CHAIN_ID" = "2050"

VOID_TOKEN="0x470075B85352Eb86F7d089FB9ba88945f12AAd94"
VALIDATOR_SET="0x4b3F78e86b0427F750938e7B022d98aA4275F2f7"
REWARD_ENGINE="0xE2670614aB3caB77999847F3FD2fF6Fc34fe2292"

for pair in "VoidToken:$VOID_TOKEN" "ValidatorSet:$VALIDATOR_SET" "RewardEngine:$REWARD_ENGINE"; do
  name="${pair%%:*}"
  addr="${pair#*:}"
  code="$(cast code "$addr" --rpc-url "$RPC")"
  len="${#code}"
  echo "${name}_code_len=$len"
  test "$len" -gt 2
done

python3 - <<'PY'
import json, os, subprocess
rpc = os.environ.get("RPC", "http://127.0.0.1:8545")
j = json.load(open("ops/mainnet/validator-truth-upgrade-track.deployed.json"))
for name, addr in j["contracts"].items():
    out = subprocess.check_output(["cast", "code", addr, "--rpc-url", rpc], text=True).strip()
    print(f"{name}={addr} code_len={len(out)}")
    assert len(out) > 2
PY

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
j = json.loads(os.environ["READY_JSON"])
assert j["ready"] is True
assert int(j["gap"]) == 0
assert int(j["txroot_live"]) == 1
PY

STATUS="$(curl -fsS "$BASE/__void/runtime/validator-truth/status")"
STATUS_JSON="$STATUS" python3 - <<'PY'
import json, os
j = json.loads(os.environ["STATUS_JSON"])
print("latestEpoch=" + str(j.get("latestEpoch")))
assert int(j["latestEpoch"]) == 125
PY

EPOCH="$(curl -fsS "$BASE/__void/runtime/validator-truth/epoch/125")"
EPOCH_JSON="$EPOCH" python3 - <<'PY'
import json, os
j = json.loads(os.environ["EPOCH_JSON"])
s = j["summary"]
print("epoch=" + str(s.get("epoch")))
print("validatorCount=" + str(s.get("validatorCount")))
print("totalPower=" + str(s.get("totalPower")))
print("published=" + str(s.get("published")))
print("publishedMatch=" + str(s.get("publishedMatch")))
assert int(s["epoch"]) == 125
assert int(s["validatorCount"]) == 124
assert str(s["totalPower"]) == "124000000000000000000000"
assert s["published"] is True
assert s["publishedMatch"] is True
PY

NEXT="$(curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard")"
NEXT_JSON="$NEXT" python3 - <<'PY'
import json, os
j = json.loads(os.environ["NEXT_JSON"])
print("selectedCandidateName=" + str(j.get("selectedCandidateName")))
print("currentEpoch=" + str(j.get("currentEpoch")))
print("targetEpoch=" + str(j.get("targetEpoch")))
print("currentValidatorCount=" + str(j.get("currentValidatorCount")))
print("expectedValidatorCount=" + str(j.get("expectedValidatorCount")))
assert j["selectedCandidateName"] == "vault124"
assert int(j["currentEpoch"]) == 125
assert int(j["targetEpoch"]) == 126
assert int(j["currentValidatorCount"]) == 124
assert int(j["expectedValidatorCount"]) == 125
PY

echo "[ok] 8545 epoch125 state proof green"
