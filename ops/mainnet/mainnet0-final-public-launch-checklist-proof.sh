#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-final-public-launch-checklist.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BLOCKERS="ops/mainnet/mainnet0-blockers.current.md"
FINAL_PATH="ops/mainnet/mainnet0-final-path.current.md"
LAUNCH_APPROVAL_PLAN="ops/mainnet/mainnet0-launch-approval-plan.current.md"

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"

echo "=== Mainnet-0 final public launch checklist proof ==="

echo
echo "=== [1] required docs ==="
test -f "$DOC"
test -f "$STATUS"
test -f "$BLOCKERS"
test -f "$FINAL_PATH"
test -f "$LAUNCH_APPROVAL_PLAN"

grep -q 'status: not_go_for_public_mainnet0' "$DOC"
grep -q 'mutation_allowed: false' "$DOC"
grep -q 'launch_approval: false' "$DOC"
grep -q 'money_step: last' "$DOC"
grep -q 'Launch approval plan baseline refresh is cross-box proven at 2a80ba9a / ckpt-launch-approval-plan-baseline-refresh-green-20260521-123542.' "$DOC"
grep -q 'Final go/no-go map current-baseline ref is cross-box proven at 6a8d15fb / ckpt-final-gonogo-current-baseline-ref-green-20260521-121728.' "$DOC"
grep -q 'Current baseline summary-output checkpoint is cross-box proven at 29e4c672 / ckpt-current-baseline-summary-output-green-20260521-120111.' "$DOC"
grep -q 'Final path Wallet doc refresh is cross-box proven at 5d39ab41 / ckpt-final-path-wallet-doc-refresh-green-20260521-114305.' "$DOC"
grep -q 'Final path includes wallet-ui-cleanup-proof.' "$DOC"
grep -q 'Public validator promotion/admission remains blocked' "$DOC"
grep -q 'Ready signals are not launch approval' "$DOC"
grep -q 'Launch approval plan is proof-backed and still not approved' "$DOC"
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

grep -q 'status: plan_only_not_approved' "$LAUNCH_APPROVAL_PLAN"
grep -q 'launch_approval: false' "$LAUNCH_APPROVAL_PLAN"
grep -q 'mutation_allowed: false' "$LAUNCH_APPROVAL_PLAN"
grep -q 'Do not approve public Mainnet-0 launch yet' "$LAUNCH_APPROVAL_PLAN"
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
echo "=== [5] update-safety Prom metric is fresh when Prometheus is reachable ==="
PROM_BASE="${PROM_BASE:-http://127.0.0.1:9090}"

if curl -fsS --max-time 2 --get "$PROM_BASE/api/v1/query" \
  --data-urlencode 'query=void_mainnet0_update_safety_ok' >/tmp/void-final-checklist-update-safety-ok.json 2>/tmp/void-final-checklist-prom.err; then

  cat /tmp/void-final-checklist-update-safety-ok.json
  echo

  curl -fsS --max-time 2 --get "$PROM_BASE/api/v1/query" \
    --data-urlencode 'query=time() - void_mainnet0_update_safety_timestamp_seconds' \
    >/tmp/void-final-checklist-update-safety-age.json

  cat /tmp/void-final-checklist-update-safety-age.json
  echo

  python3 - <<'PYCHECK'
import json
from pathlib import Path

ok = json.loads(Path("/tmp/void-final-checklist-update-safety-ok.json").read_text())
age = json.loads(Path("/tmp/void-final-checklist-update-safety-age.json").read_text())

assert ok.get("status") == "success", ok
rows = ok.get("data", {}).get("result", [])
assert rows, ok
assert str(rows[0].get("value", [None, None])[1]) == "1", ok

assert age.get("status") == "success", age
age_rows = age.get("data", {}).get("result", [])
assert age_rows, age
age_s = float(age_rows[0].get("value", [None, "999999"])[1])
assert age_s < 600, age

print("[ok] update-safety metric is green/fresh")
PYCHECK

else
  echo "[skip] Prometheus not reachable at $PROM_BASE; treating this as non-Prometheus follower/status-smoke box"
  echo "prom_error=$(cat /tmp/void-final-checklist-prom.err 2>/dev/null || true)"
  make mainnet0-status-smoke
  echo "[ok] fallback status smoke passed on non-Prometheus box"
fi
echo "=== [6] launch approval plan proof remains green ==="
make mainnet0-launch-approval-plan-proof

echo "=== [6b] existing fail-closed proof remains green ==="
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
