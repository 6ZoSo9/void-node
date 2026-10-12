#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-public-validator-admission-decision.current.md"
DESIGN="ops/mainnet/mainnet0-public-validator-admission-design.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BLOCKERS="ops/mainnet/mainnet0-blockers.current.md"
FINAL_CHECKLIST="ops/mainnet/mainnet0-final-public-launch-checklist.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 public validator admission decision proof ==="

echo
echo "=== [1] required docs ==="
test -f "$DOC"
test -f "$DESIGN"
test -f "$STATUS"
test -f "$BLOCKERS"
test -f "$FINAL_CHECKLIST"
echo "[ok] required docs exist"

echo
echo "=== [2] decision is candidate-only and non-mutating ==="
grep -q '^status: candidate_only_for_mainnet0$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^public_active_admission_enabled: false$' "$DOC"
grep -q '^public_registration_result: candidate_or_waiting_only$' "$DOC"
grep -q '^public_registration_mutates_active_set: false$' "$DOC"
grep -q '^active_admission_requires_guarded_operator_epoch_step: true$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q 'Public active validator promotion/admission is not launched in Mainnet-0.' "$DOC"
grep -q 'This decision does not approve public Mainnet-0 launch.' "$DOC"
echo "[ok] decision is explicitly candidate-only / non-mutating / not launch approval"

echo
echo "=== [3] locked policy preserved ==="
grep -q 'public candidate minimum stake target: 10000 VOID' "$DOC"
grep -q 'active validator cap: 256' "$DOC"
grep -q 'activation churn limit per epoch: 4' "$DOC"
grep -q 'public registration result: candidate_or_waiting_only' "$DOC"
grep -q 'public registration directly mutates active set: false' "$DOC"
grep -q 'active admission requires guarded operator epoch step: true' "$DOC"
grep -q 'money step remains last: true' "$DOC"

grep -q 'public_registration_mutates_active_set: false' "$DESIGN"
grep -q 'public_registration_result: candidate_or_waiting_only' "$DESIGN"
grep -q 'active_admission_requires_guarded_epoch_step: true' "$DESIGN"
grep -q 'Mainnet-0 active validator cap remains 256' "$DESIGN"
grep -q 'Activation churn limit remains 4 per epoch' "$DESIGN"
grep -q 'Public candidate minimum stake target remains 10,000 VOID' "$DESIGN"
echo "[ok] locked public admission policy preserved"

echo
echo "=== [4] existing status docs still block active public admission ==="
grep -q 'status: public_mainnet0_live' "$STATUS"
grep -q 'Public validator candidate promotion/admission remains blocked' "$STATUS"
grep -q 'public registration/candidate/waiting status remains non-launching' "$STATUS"
grep -q 'public registration does not mutate the active validator set' "$STATUS"

grep -q 'launch_state: public_mainnet0_live' "$BLOCKERS"
grep -q 'Public participant validator registration remains candidate/waiting only' "$BLOCKERS"
grep -q 'Public registration does not instantly expand the active validator set' "$BLOCKERS"

grep -q 'status: public_mainnet0_live' "$FINAL_CHECKLIST"
grep -q 'Public validator registration remains candidate/waiting only' "$FINAL_CHECKLIST"
grep -q 'Public validator promotion/admission remains blocked' "$FINAL_CHECKLIST"
echo "[ok] status/blocker/checklist docs still block public active admission"

echo
echo "=== [5] runtime endpoint and UI copy still agree ==="
curl -fsS "$BASE/__void/mainnet0/validator-candidate-registry/status" > /tmp/void-public-admission-decision.registry.json
python3 - /tmp/void-public-admission-decision.registry.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
counts=j.get("counts") or {}
policy=j.get("policy") or {}
assert j.get("ok") is True, j
assert j.get("public_registration_mutates_active_set") is False, j
assert j.get("invariant_ok") is True, j
assert str(counts.get("activeFinal")) == "0", counts
assert policy.get("registration_does_not_instantly_expand_active_validator_set") is True, policy
assert policy.get("activation_is_separate_owner_epoch_step") is True, policy
print("[ok] registry endpoint still proves public registration is non-active")
PY

curl -fsS "$BASE/participant" \
  | grep -Ei 'does not make the validator active|not active admission|candidate/waiting status|must not be confused' \
  | sed -n '1,80p'

echo
echo "=== [6] existing proof stack ==="
make mainnet0-validator-admission-blocker-proof
make mainnet0-validator-admission-promotion-plan-proof
make mainnet0-status-smoke

echo
echo "=== [7] ready after ==="
curl -fsS "$BASE/__void/ready.json" > /tmp/void-public-admission-decision.ready.json
cat /tmp/void-public-admission-decision.ready.json
echo
python3 - /tmp/void-public-admission-decision.ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [8] summary ==="
python3 - <<'PY'
print({
  "public_validator_admission_decision": "candidate_only_for_mainnet0",
  "public_active_admission_enabled": False,
  "public_registration_result": "candidate_or_waiting_only",
  "public_registration_mutates_active_set": False,
  "launch_state": "public_mainnet0_live",
  "mutation_allowed": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 public validator admission decision proof passed"
