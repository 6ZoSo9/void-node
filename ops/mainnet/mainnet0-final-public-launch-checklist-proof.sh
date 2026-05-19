#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-final-public-launch-checklist.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BLOCKERS="ops/mainnet/mainnet0-blockers.current.md"
FINAL_PATH="ops/mainnet/mainnet0-final-path.current.md"

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"

echo "=== Mainnet-0 final public launch checklist proof ==="

echo
echo "=== [1] required docs ==="
test -f "$DOC"
test -f "$STATUS"
test -f "$BLOCKERS"
test -f "$FINAL_PATH"

grep -q 'status: not_go_for_public_mainnet0' "$DOC"
grep -q 'mutation_allowed: false' "$DOC"
grep -q 'launch_approval: false' "$DOC"
grep -q 'money_step: last' "$DOC"
grep -q 'Public validator promotion/admission remains blocked' "$DOC"
grep -q 'Ready signals are not launch approval' "$DOC"
grep -q 'This checkpoint does not:' "$DOC"
grep -q 'execute vault126 onboarding' "$DOC"
grep -q 'approve public Mainnet-0 launch' "$DOC"
grep -q 'execute Buy VOID claim/send' "$DOC"

echo "[ok] checklist records explicit not-go / non-mutating launch state"

echo
echo "=== [2] existing status/blocker docs still not-go ==="
grep -q 'status: not_go_for_public_mainnet0' "$STATUS"
grep -q 'Public validator candidate promotion/admission remains blocked' "$STATUS"
grep -q 'Mainnet-0 remains not-go' "$STATUS"

grep -q 'launch_state: not_go_for_public_mainnet0' "$BLOCKERS"
grep -q 'Public Mainnet-0 approval is explicit, not inferred from readiness' "$BLOCKERS"
grep -q 'Do not change launch_state away from not_go_for_public_mainnet0' "$BLOCKERS"

grep -q 'launch_state: not_go_for_public_mainnet0' "$FINAL_PATH"
grep -q 'Public validator admission: still blocked' "$FINAL_PATH"
grep -q 'Ready signals are not launch approval' "$FINAL_PATH"

echo "[ok] existing docs still preserve launch blockers"

echo
echo "=== [3] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-final-public-launch-checklist-ready.json
echo
python3 - /tmp/void-final-public-launch-checklist-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [4] runtime truth next-onboard is dry-run information only ==="
curl -fsS "$BASE/__void/runtime/validator-truth/status" | tee /tmp/void-final-public-launch-runtime-status.json
echo
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" | tee /tmp/void-final-public-launch-next-onboard.json
echo

python3 - /tmp/void-final-public-launch-runtime-status.json /tmp/void-final-public-launch-next-onboard.json <<'PY'
import json, sys
status=json.load(open(sys.argv[1]))
next_onboard=json.load(open(sys.argv[2]))

assert status.get("ok") is True, status
assert status.get("latestEpoch") == 127, status
assert next_onboard.get("ok") is True, next_onboard
assert next_onboard.get("selectedCandidateName") == "vault126", next_onboard
assert int(next_onboard.get("targetEpoch")) == 128, next_onboard
assert int(next_onboard.get("currentValidatorCount")) == 126, next_onboard
assert int(next_onboard.get("expectedValidatorCount")) == 127, next_onboard
print("[ok] runtime truth shows vault126 next-onboard info without executing it")
PY

echo
echo "=== [5] Precision update-safety Prom metric is fresh ==="
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=void_mainnet0_update_safety_ok == 1' \
  | tee /tmp/void-final-public-launch-update-safety-ok.json
echo
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=(time() - void_mainnet0_update_safety_timestamp_seconds) < 180' \
  | tee /tmp/void-final-public-launch-update-safety-fresh.json
echo

python3 - /tmp/void-final-public-launch-update-safety-ok.json /tmp/void-final-public-launch-update-safety-fresh.json <<'PY'
import json, sys
for p in sys.argv[1:]:
    j=json.load(open(p))
    assert j.get("status") == "success", j
    assert (j.get("data") or {}).get("result"), j
print("[ok] update-safety metric is green/fresh")
PY

echo
echo "=== [6] existing fail-closed proof remains green ==="
make mainnet0-gonogo-no-go-proof

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "launch_state": "not_go_for_public_mainnet0",
  "mutation_allowed": False,
  "launch_approval": False,
  "next_operator_candidate": "vault126",
  "target_epoch": 128,
  "expected_validator_count": 127,
  "public_validator_promotion": "blocked",
  "money_step": "last",
  "proof": "final_public_launch_checklist_not_go",
})
PY

echo
echo "[ok] Mainnet-0 final public launch checklist proof passed"
