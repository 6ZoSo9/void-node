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
echo "=== [2] map encodes GO_PUBLIC_MAINNET0 state ==="
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^launch_approval: true$' "$DOC"
grep -q '^mutation_allowed: true$' "$DOC"
grep -q '^money_step: ops_seed_complete_future_spend_guarded$' "$DOC"
grep -q 'current_baseline_pointer_commit: 4c3aa800' "$DOC"
grep -q 'current_baseline_pointer_tag: ckpt-mainnet0-public-launch-promotion-proof-green-20260524-071500' "$DOC"
grep -q 'cross_box_proven: true' "$DOC"
grep -q 'GO_PUBLIC_MAINNET0' "$DOC"
grep -q 'launch_approval is true through the committed launch approval artifact' "$DOC"
grep -q 'future treasury spend remains separately guarded' "$DOC"
grep -q 'Current baseline pointer records 4c3aa800 / ckpt-mainnet0-public-launch-promotion-proof-green-20260524-071500 as the canonical public-live promotion baseline.' "$DOC"
grep -q 'Product surface proof is green.' "$DOC"
grep -q 'DataNet tab proof is green.' "$DOC"
grep -q 'Participant DataNet E2E proof is green.' "$DOC"
grep -q 'Participant golden path proof is green.' "$DOC"
grep -q 'Remote product/network regression proof is green.' "$DOC"
grep -q 'WC trade remains non-mutating in product surface and is covered by separate WC stack proofs.' "$DOC"
grep -q 'Final path includes wallet-ui-cleanup-proof.' "$DOC"
grep -q 'Final checklist sections closeout doc preserves restored proof sections and supersedes fdfa1af5.' "$DOC"
grep -q 'Final checklist sections closeout doc is cross-box proven.' "$BASELINE"
grep -q '^commit: 4c3aa800$' "$BASELINE"
grep -q '^tag: ckpt-mainnet0-public-launch-promotion-proof-green-20260524-071500$' "$BASELINE"
echo "[ok] go/no-go map is public-live and guardrailed"

echo
echo "=== [3] current baseline pointer remains locked ==="
grep -q '^status: current_baseline_cross_box_proven$' "$BASELINE"
grep -q '^launch_state: public_mainnet0_live$' "$BASELINE"
grep -q '^mutation_allowed: true$' "$BASELINE"
grep -q '^launch_approval: true$' "$BASELINE"
grep -q '^money_step: ops_seed_complete_future_spend_guarded$' "$BASELINE"
grep -q 'Public validator admission remains candidate_only_for_mainnet0' "$BASELINE"
grep -q 'Public active validator admission remains disabled' "$BASELINE"
grep -q 'Next operator candidate remains vault126 / epoch128 / expectedValidatorCount=127' "$BASELINE"
echo "[ok] canonical baseline pointer remains public-live and guardrailed"

echo
echo "=== [4] launch docs encode promoted public launch with guardrails ==="
grep -q 'status: public_mainnet0_live' "$STATUS"
grep -q 'launch_state: public_mainnet0_live' "$BLOCKERS"
grep -q 'launch_state: public_mainnet0_live' "$FINAL_PATH"
grep -q 'It is not launch approval.' "$LAUNCH_PLAN"
grep -q 'candidate_only_for_mainnet0' "$PUBLIC_VALIDATOR_DECISION"
grep -qiE 'public active admission (stays )?disabled|public_active_admission_enabled: false|public active validator admission remains disabled' "$PUBLIC_VALIDATOR_DECISION"
echo "[ok] launch docs encode public launch state with validator/spend guardrails"

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
echo "=== [6] next-onboard status route is public-safe / non-executing ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > /tmp/void-final-gonogo-next-onboard.json
python3 - /tmp/void-final-gonogo-next-onboard.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
mode = j.get("mode", "")
disabled = j.get("disabled")
if disabled is True or mode == "public_safe_status_only":
    assert disabled is True, j
    assert mode == "public_safe_status_only", j
    assert j.get("blocker") == "validator_next_onboard_status_runbook_disabled", j
    assert j.get("liveExecutionEnabled") is False, j
    assert j.get("selectedCandidateName") == "", j
    assert j.get("selectedCandidateAddr") == "", j
    assert int(j.get("targetEpoch", -1)) == 0, j
    assert int(j.get("expectedValidatorCount", -1)) == 0, j
    assert j.get("command") == "", j
    assert j.get("raw") == "", j
    assert "does not spawn validator next-onboard runbooks" in j.get("note", ""), j
    print("[ok] next-onboard status route is public-safe disabled / non-executing")
else:
    assert j.get("selectedCandidateName") == "vault126", j
    assert int(j.get("targetEpoch")) == 128, j
    assert int(j.get("expectedValidatorCount")) == 127, j
    assert not j.get("command"), j
    assert not j.get("raw"), j
    print("[ok] next-onboard remains vault126 / epoch128 / expectedValidatorCount=127 without execution payload")
PY

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "decision": "GO_PUBLIC_MAINNET0",
  "launch_state": "public_mainnet0_live",
  "launch_approval": True,
  "mutation_allowed": True,
  "public_validator_admission": "candidate_only_for_mainnet0",
  "public_active_admission_enabled": False,
  "next_operator_candidate": "vault126",
  "target_epoch": 128,
  "expected_validator_count": 127,
  "money_step": "ops_seed_complete_future_spend_guarded",
})
PY

echo
echo "[ok] Mainnet-0 final go/no-go map proof passed"
