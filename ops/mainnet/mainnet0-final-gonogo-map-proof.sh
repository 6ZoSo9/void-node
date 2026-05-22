#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-final-gonogo-map.current.md"
BASELINE="ops/mainnet/mainnet0-current-baseline.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BLOCKERS="ops/mainnet/mainnet0-blockers.current.md"
FINAL_PATH="ops/mainnet/mainnet0-final-path.current.md"
LAUNCH_PLAN="ops/mainnet/mainnet0-launch-approval-plan.current.md"
PUBLIC_VALIDATOR_DECISION="ops/mainnet/mainnet0-public-validator-admission-decision.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 final go/no-go map proof ==="

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$BASELINE"
test -f "$STATUS"
test -f "$BLOCKERS"
test -f "$FINAL_PATH"
test -f "$LAUNCH_PLAN"
test -f "$PUBLIC_VALIDATOR_DECISION"
echo "[ok] required files exist"

echo
echo "=== [2] map encodes NO-GO state ==="
grep -q '^status: not_go_for_public_mainnet0$' "$DOC"
grep -q '^decision: NO_GO$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q 'current_baseline_pointer_commit: cc8a4f4a' "$DOC"
grep -q 'current_baseline_pointer_tag: ckpt-final-checklist-sections-closeout-doc-green-20260521-195012' "$DOC"
grep -q 'cross_box_proven: true' "$DOC"
grep -q 'NO-GO' "$DOC"
grep -q 'Ready signals alone are not launch approval' "$DOC"
grep -q 'Money step remains last' "$DOC"
grep -q 'Current baseline pointer output is aligned with the latest Wallet doc refresh baseline.' "$DOC"
grep -q 'Final path includes wallet-ui-cleanup-proof.' "$DOC"
grep -q 'Current baseline pointer now records final checklist sections closeout doc as the canonical rolling baseline.' "$DOC"
grep -q 'Final checklist sections closeout doc preserves restored proof sections and supersedes fdfa1af5.' "$DOC"
grep -q 'Final checklist sections closeout doc is cross-box proven.' "$BASELINE"
grep -q '^commit: cc8a4f4a$' "$BASELINE"
grep -q '^tag: ckpt-final-checklist-sections-closeout-doc-green-20260521-195012$' "$BASELINE"
echo "[ok] go/no-go map is explicit and non-mutating"

echo
echo "=== [3] current baseline pointer remains locked ==="
grep -q '^status: current_baseline_cross_box_proven$' "$BASELINE"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$BASELINE"
grep -q '^mutation_allowed: false$' "$BASELINE"
grep -q '^launch_approval: false$' "$BASELINE"
grep -q '^money_step: last$' "$BASELINE"
grep -q 'Public validator admission remains candidate_only_for_mainnet0' "$BASELINE"
grep -q 'Public active validator admission remains disabled' "$BASELINE"
grep -q 'Next operator candidate remains vault126 / epoch128 / expectedValidatorCount=127' "$BASELINE"
echo "[ok] canonical baseline pointer remains fail-closed"

echo
echo "=== [4] existing launch docs still block approval ==="
grep -q 'status: not_go_for_public_mainnet0' "$STATUS"
grep -q 'launch_state: not_go_for_public_mainnet0' "$BLOCKERS"
grep -q 'launch_state: not_go_for_public_mainnet0' "$FINAL_PATH"
grep -q 'It is not launch approval.' "$LAUNCH_PLAN"
grep -q 'candidate_only_for_mainnet0' "$PUBLIC_VALIDATOR_DECISION"
grep -qiE 'public active admission (stays )?disabled|public_active_admission_enabled: false|public active validator admission remains disabled' "$PUBLIC_VALIDATOR_DECISION"
echo "[ok] launch docs still block approval"

echo
echo "=== [5] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-final-gonogo-ready.json
echo
python3 - /tmp/void-final-gonogo-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [6] next-onboard remains guarded selector only ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > /tmp/void-final-gonogo-next-onboard.json
python3 - /tmp/void-final-gonogo-next-onboard.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("selectedCandidateName") == "vault126", j
assert int(j.get("targetEpoch")) == 128, j
assert int(j.get("expectedValidatorCount")) == 127, j
print("[ok] next-onboard remains vault126 / epoch128 / expectedValidatorCount=127")
PY

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "decision": "NO_GO",
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "public_validator_admission": "candidate_only_for_mainnet0",
  "public_active_admission_enabled": False,
  "next_operator_candidate": "vault126",
  "target_epoch": 128,
  "expected_validator_count": 127,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 final go/no-go map proof passed"
