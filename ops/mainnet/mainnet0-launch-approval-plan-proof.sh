#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-launch-approval-plan.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BLOCKERS="ops/mainnet/mainnet0-blockers.current.md"
FINAL_PATH="ops/mainnet/mainnet0-final-path.current.md"
FINAL_CHECKLIST="ops/mainnet/mainnet0-final-public-launch-checklist.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 launch approval plan proof ==="

echo
echo "=== [1] required docs ==="
test -f "$DOC"
test -f "$STATUS"
test -f "$BLOCKERS"
test -f "$FINAL_PATH"
test -f "$FINAL_CHECKLIST"
echo "[ok] required docs exist"

echo
echo "=== [2] plan-only / not-approved markers ==="
grep -q '^status: plan_only_not_approved$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q 'It is not launch approval.' "$DOC"
grep -q 'It does not change launch_state.' "$DOC"
grep -q 'It does not promote public validators.' "$DOC"
grep -q 'It does not execute vault126 onboarding.' "$DOC"
grep -q 'It does not execute Buy VOID claim/send.' "$DOC"
grep -q 'Do not approve public Mainnet-0 launch yet.' "$DOC"
echo "[ok] launch approval plan is explicitly non-mutating and not approved"

echo
echo "=== [3] current baseline markers ==="
grep -q 'current_final_public_launch_checklist_baseline: ckpt-public-validator-candidate-only-posture-green-20260522-125742' "$DOC"
grep -q 'current_commit: 16c20d3f' "$DOC"
grep -q 'public validator promotion/admission remains blocked' "$DOC"
grep -q 'launch approval remains false' "$DOC"
grep -q 'Buy VOID first real fulfillment is closeout-proven' "$DOC"
grep -q 'final go/no-go map current-baseline reference is cross-box proven.' "$DOC"
grep -q 'current baseline summary-output checkpoint is cross-box proven.' "$DOC"
grep -q 'final path includes wallet-ui-cleanup-proof.' "$DOC"
grep -q 'current baseline + final go/no-go map refresh is cross-box proven at 16c20d3f / ckpt-public-validator-candidate-only-posture-green-20260522-125742.' "$DOC"
grep -q 'current baseline pointer records 16c20d3f / ckpt-public-validator-candidate-only-posture-green-20260522-125742.' "$DOC"
grep -q 'product surface, Settings UI, and public validator candidate-only posture proof stack are green.' "$DOC"
grep -q 'DataNet tab proof is green.' "$DOC"
grep -q 'participant DataNet E2E proof is green.' "$DOC"
grep -q 'participant golden path proof is green.' "$DOC"
grep -q 'remote product/network regression proof is green.' "$DOC"
grep -q 'WC trade remains non-mutating in product surface and is covered by separate WC stack proofs.' "$DOC"
grep -q 'final checklist sections preserve update-safety Prometheus-or-fallback, launch approval plan proof, and fail-closed go/no-go Prometheus-or-fallback sections.' "$DOC"
echo "[ok] plan references current proven baseline"

echo
echo "=== [4] future approval gates are explicit ==="
grep -q 'mainnet0-status-proof passes on Precision' "$DOC"
grep -q 'mainnet0-blockers-proof passes on Precision' "$DOC"
grep -q 'mainnet0-prelaunch-safety-proof passes on Precision' "$DOC"
grep -q 'mainnet0-final-path-proof passes on Precision' "$DOC"
grep -q 'mainnet0-final-public-launch-checklist-proof passes on Precision' "$DOC"
grep -q 'mainnet0-crossbox-status-smoke passes from Precision' "$DOC"
grep -q 'update-safety metric is green and fresh on Precision' "$DOC"
grep -q 'public release sanitization is rerun after the last code change and is clean' "$DOC"
grep -q 'public validator promotion/admission decision is explicit' "$DOC"
grep -q 'operator writes a separate explicit launch approval artifact' "$DOC"
echo "[ok] future approval gates are documented"

echo
echo "=== [5] existing launch docs still block approval ==="
grep -q 'status: not_go_for_public_mainnet0' "$STATUS"
grep -q 'Public validator candidate promotion/admission remains blocked' "$STATUS"
grep -q 'Ready signals are not the same as launch approval' "$STATUS"

grep -q 'launch_state: not_go_for_public_mainnet0' "$BLOCKERS"
grep -q 'Do not change launch_state away from not_go_for_public_mainnet0' "$BLOCKERS"

grep -q 'launch_state: not_go_for_public_mainnet0' "$FINAL_PATH"
grep -q 'Public validator admission: still blocked' "$FINAL_PATH"

grep -q 'launch_approval: false' "$FINAL_CHECKLIST"
grep -q 'Public validator promotion/admission remains blocked' "$FINAL_CHECKLIST"
echo "[ok] existing docs still block launch approval"

echo
echo "=== [6] node ready ==="
curl -fsS "$BASE/__void/ready.json" > /tmp/void-launch-approval-plan-ready.json
cat /tmp/void-launch-approval-plan-ready.json
echo
python3 - /tmp/void-launch-approval-plan-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [7] no secret words in launch approval plan ==="
python3 - "$DOC" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text().lower()
bad = []
for word in ["private_key", "mnemonic", "seed phrase", "keystore", "passphrase", "signing secret"]:
    if word in text:
        bad.append(word)
assert not bad, bad
print("[ok] no secret material markers in launch approval plan")
PY

echo
echo "=== [8] summary ==="
python3 - <<'PY'
print({
  "launch_approval_plan": "green",
  "status": "plan_only_not_approved",
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "public_validator_promotion": "blocked",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 launch approval plan proof passed"
