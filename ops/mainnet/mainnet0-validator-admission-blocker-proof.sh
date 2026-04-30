#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
LIVE_JSON="ops/mainnet/void-mainnet.live.json"
VALIDATOR_STATUS="ops/mainnet/validator-status.current.yaml"

echo "=== Mainnet-0 validator admission blocker proof ==="

echo
echo "=== [1] file truth ==="
test -f "$LIVE_JSON"
test -f "$VALIDATOR_STATUS"

grep -q "status: plan_only_candidate_declared" "$VALIDATOR_STATUS"
grep -q "not active or live admitted" "$VALIDATOR_STATUS"

python3 - "$LIVE_JSON" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("mode") == "plan_only", j
assert j.get("status") == "plan_only_not_live", j
v=(j.get("validators") or [])[0]
assert v.get("status") == "candidate_not_active", v
assert v.get("id") == "candidate-validator-01", v
assert (j.get("validator0") or {}).get("reward"), j
assert (j.get("validator0") or {}).get("consensusKey"), j
print("[ok] live json is plan-only candidate_not_active")
PY

echo
echo "=== [2] participant validator registration endpoint ==="
P="/tmp/void-validator-admission-blocker.participant.json"
curl -fsS "$BASE/__void/participant/validator-registration/status?account=$ACCOUNT" -o "$P"
python3 -m json.tool "$P" | sed -n "1,120p"
python3 - "$P" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
s=j.get("status") or {}
p=j.get("policy") or {}
lp=j.get("latest_proof") or {}
assert j.get("ok") is True, j
assert s.get("state") == "waiting", s
assert s.get("registered") is True, s
assert p.get("becomes_active_immediately") is False, p
assert p.get("enters_waiting_pool_before_active_admission") is True, p
assert str(lp.get("activeCountFinal")) == "0", lp
assert str(lp.get("waitingCountFinal")) == "1", lp
print("[ok] participant endpoint proves waiting, not active")
PY

echo
echo "=== [3] global candidate registry endpoint ==="
G="/tmp/void-validator-admission-blocker.registry.json"
curl -fsS "$BASE/__void/mainnet0/validator-candidate-registry/status" -o "$G"
python3 -m json.tool "$G" | sed -n "1,140p"
python3 - "$G" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
counts=j.get("counts") or {}
policy=j.get("policy") or {}
assert j.get("ok") is True, j
assert j.get("public_registration_mutates_active_set") is False, j
assert j.get("invariant_ok") is True, j
assert str(counts.get("activeFinal")) == "0", counts
assert str(counts.get("waitingFinal")) == "1", counts
assert policy.get("registration_does_not_instantly_expand_active_validator_set") is True, policy
assert policy.get("activation_is_separate_owner_epoch_step") is True, policy
print("[ok] registry endpoint proves public registration does not mutate active set")
PY

echo
echo "=== [4] participant UI copy ==="
curl -fsS "$BASE/participant" \
  | grep -Ei "does not make the validator active|not active admission|operator-only live onboarding|must not be confused|candidate/waiting status" \
  | sed -n "1,80p"

echo
echo "=== [5] summary ==="
python3 - <<'PY'
print({
  "validator_blocker": "not_active_or_live_admitted",
  "live_json": "plan_only_candidate_not_active",
  "registration_state": "waiting",
  "active_count_final": 0,
  "public_registration_mutates_active_set": False,
})
PY

echo
echo "[ok] Mainnet-0 validator admission blocker proof passed"
