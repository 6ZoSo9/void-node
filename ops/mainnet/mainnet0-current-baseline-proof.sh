#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-current-baseline.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 current baseline pointer proof ==="

echo
echo "=== [1] current baseline doc ==="
test -f "$DOC"

grep -q '^status: current_baseline_cross_box_proven$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q '^commit: e25569f6$' "$DOC"
grep -q '^tag: ckpt-status-blockers-final-path-ref-clean-green-20260521-004917$' "$DOC"
grep -q '^cross_box_proven: true$' "$DOC"
grep -q 'Public validator admission remains candidate_only_for_mainnet0' "$DOC"
grep -q 'Public active validator admission remains disabled' "$DOC"
grep -q 'Public registration remains candidate_or_waiting_only' "$DOC"
grep -q 'Public registration does not mutate the active validator set' "$DOC"
grep -q 'Next operator candidate remains vault126 / epoch128 / expectedValidatorCount=127' "$DOC"
grep -q 'This file is the canonical rolling pointer' "$DOC"
echo "[ok] canonical baseline pointer is explicit and non-mutating"

echo
echo "=== [2] git checkpoint matches pointer ==="
HEAD="$(git rev-parse --short HEAD)"
DESC="$(git describe --tags --always --dirty)"
echo "head=$HEAD"
echo "describe=$DESC"

test "$HEAD" = "e25569f6"
test "$DESC" = "ckpt-status-blockers-final-path-ref-clean-green-20260521-004917"
echo "[ok] repo matches current baseline pointer"

echo
echo "=== [3] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-current-baseline-ready.json
echo
python3 - /tmp/void-current-baseline-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [4] runtime truth selector remains dry-run only ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > /tmp/void-current-baseline-next-onboard.json
python3 - /tmp/void-current-baseline-next-onboard.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("selectedCandidateName") == "vault126", j
assert int(j.get("currentEpoch")) == 127, j
assert int(j.get("targetEpoch")) == 128, j
assert int(j.get("currentValidatorCount")) == 126, j
assert int(j.get("expectedValidatorCount")) == 127, j
print("[ok] next-onboard remains vault126 / epoch128 / count127")
PY

echo
echo "=== [5] existing launch docs still block approval ==="
grep -q 'status: not_go_for_public_mainnet0' ops/mainnet/mainnet0-status.current.md
grep -q 'launch_state: not_go_for_public_mainnet0' ops/mainnet/mainnet0-blockers.current.md
grep -q 'launch_state: not_go_for_public_mainnet0' ops/mainnet/mainnet0-final-path.current.md
grep -q 'It is not launch approval.' ops/mainnet/mainnet0-launch-approval-plan.current.md
grep -q 'Public validator admission remains candidate_only_for_mainnet0' "$DOC"
echo "[ok] launch docs still fail closed"

echo
echo "=== [6] summary ==="
python3 - <<'PY'
print({
  "current_baseline": "e25569f6",
  "tag": "ckpt-status-blockers-final-path-ref-clean-green-20260521-004917",
  "cross_box_proven": True,
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "public_validator_admission": "candidate_only_for_mainnet0",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 current baseline pointer proof passed"
