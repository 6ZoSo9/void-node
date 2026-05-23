#!/usr/bin/env bash
set -euo pipefail

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-launch-approval-artifact-prep.current.md"
BASELINE="ops/mainnet/mainnet0-current-baseline.current.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"
CHECKLIST="ops/mainnet/mainnet0-final-public-launch-checklist.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"

echo "=== Mainnet-0 launch approval artifact prep proof ==="

echo
echo "=== [1] required docs ==="
test -f "$DOC"
test -f "$BASELINE"
test -f "$GONOGO"
test -f "$CHECKLIST"
test -f "$STATUS"
echo "[ok] required docs exist"

echo
echo "=== [2] prep doc is explicitly not approval ==="
grep -q '^status: plan_only_not_approved$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^approval_artifact_created: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q 'This document is not launch approval.' "$DOC"
grep -q 'This prep artifact is green only if it proves the future approval requirements are documented while current launch approval remains false.' "$DOC"
echo "[ok] prep doc is plan-only and not approved"

echo
echo "=== [3] current baseline references are current ==="
grep -q 'current_baseline: 69fc2c96 / ckpt-mainnet0-baseline-launch-approval-prep-green-20260523-070707' "$DOC"
grep -q 'final_checklist_validator_candidate_posture: 152cf74c / ckpt-final-checklist-validator-candidate-posture-green-20260523-020915' "$DOC"
grep -q 'launch_approval_artifact_prep_checkpoint: 654ea54f / ckpt-launch-approval-artifact-prep-green-20260523-024355' "$DOC"
grep -q '^commit: 654ea54f$' "$BASELINE"
grep -q '^tag: ckpt-launch-approval-artifact-prep-green-20260523-024355$' "$BASELINE"
grep -q 'current_baseline_pointer_commit: 654ea54f' "$GONOGO"
grep -q 'current_baseline_pointer_tag: ckpt-launch-approval-artifact-prep-green-20260523-024355' "$GONOGO"
echo "[ok] prep references current proven baseline"

echo
echo "=== [4] candidate-only validator posture preserved ==="
grep -q 'public validator registration is candidate/waiting-only for Mainnet-0.' "$DOC"
grep -q 'public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator candidate-only launch posture' "$CHECKLIST"
grep -q 'active public promotion/admission remains disabled for Mainnet-0 unless a later explicit launch-approved lane changes it' "$CHECKLIST"
grep -q 'Public validator admission remains candidate_only_for_mainnet0.' "$BASELINE"
echo "[ok] validator posture remains candidate-only"

echo
echo "=== [5] launch remains blocked in existing docs ==="
grep -q '^status: not_go_for_public_mainnet0$' "$GONOGO"
grep -q '^decision: NO_GO$' "$GONOGO"
grep -q '^launch_approval: false$' "$GONOGO"
grep -q '^mutation_allowed: false$' "$GONOGO"
grep -q '^status: not_go_for_public_mainnet0$' "$STATUS"
grep -q 'Ready signals are not the same as launch approval.' "$STATUS"
grep -q 'Ready signals are not launch approval.' "$CHECKLIST"
echo "[ok] existing docs still block launch"

echo
echo "=== [6] future approval requirements are documented ==="
grep -q 'A future approval artifact must be a separate file' "$DOC"
grep -q 'explicit operator approval intent' "$DOC"
grep -q 'exact baseline commit and tag being approved' "$DOC"
grep -q 'public validator active-admission decision' "$DOC"
grep -q 'Buy VOID fulfillment policy state' "$DOC"
grep -q 'final go/no-go proof result' "$DOC"
grep -q 'Precision readiness result' "$DOC"
grep -q 'Alienware readiness result' "$DOC"
grep -q 'explicit statement that no credential material is included' "$DOC"
grep -q 'final operator signature or equivalent operator-authored approval marker' "$DOC"
echo "[ok] future approval requirements documented"

echo
echo "=== [7] focused proof stack remains green ==="
make mainnet0-current-baseline-proof
make mainnet0-final-gonogo-map-proof
make mainnet0-launch-approval-plan-proof
make mainnet0-final-public-launch-checklist-proof
make mainnet0-status-smoke
echo "[ok] focused proof stack green"

echo
echo "=== [8] no secret material markers ==="
if grep -Eiq '(private.?key|mnemonic|seed phrase|secret=|password=|BEGIN PRIVATE KEY)' "$DOC"; then
  echo "[fail] secret-like marker found in $DOC"
  exit 1
fi
echo "[ok] no secret markers in prep doc"

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "launch_approval_artifact_prep": "green",
  "approval_artifact_created": False,
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "public_validator_registration": "candidate_waiting_only",
  "public_active_validator_admission": "disabled",
  "validator_mutation": False,
  "buy_void_fulfillment": False,
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 launch approval artifact prep proof passed"
