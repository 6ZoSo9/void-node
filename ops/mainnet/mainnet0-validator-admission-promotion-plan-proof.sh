#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

PLAN="ops/mainnet/mainnet0-validator-admission-promotion-plan.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BLOCKERS="ops/mainnet/mainnet0-blockers.current.md"

echo "=== Mainnet-0 validator admission promotion plan proof ==="

echo
echo "=== [1] required files ==="
test -f "$PLAN"
test -f "$STATUS"
test -f "$BLOCKERS"
echo "[ok] required files exist"

echo
echo "=== [2] plan-only / non-mutating doc checks ==="
grep -q "status: plan_only" "$PLAN"
grep -q "launch_state: not_go_for_public_mainnet0" "$PLAN"
grep -q "mutation_allowed: false" "$PLAN"
grep -q "This plan does not activate a validator" "$PLAN"
grep -q "This plan does not mutate live validator state" "$PLAN"
grep -q "This plan does not approve public Mainnet-0 launch" "$PLAN"
grep -q "Public validator registration is not active validator admission" "$PLAN"
grep -q "The money step remains last" "$PLAN"
grep -q "Final public Mainnet-0 go/no-go remains blocked" "$PLAN"
grep -q "public candidate minimum stake: 10000 VOID" "$PLAN"
grep -q "active validator cap: 256" "$PLAN"
grep -q "activation churn limit per epoch: 4" "$PLAN"
grep -q "public registration result: candidate_or_waiting_only" "$PLAN"
grep -q "public registration directly mutates active set: false" "$PLAN"
grep -q "active admission requires guarded operator epoch step: true" "$PLAN"
grep -q "Current 1000 VOID proof defaults are implementation gaps only" "$PLAN"
echo "[ok] plan is explicitly plan-only, non-mutating, and policy-aligned"

echo
echo "=== [3] current status still blocks launch ==="
grep -q "status: not_go_for_public_mainnet0" "$STATUS"
grep -q "Public validator candidate promotion/admission remains blocked" "$STATUS"
grep -q "Public candidate/waiting registration must not be confused with operator/bootstrap validator admission" "$STATUS"
grep -q "Operator/bootstrap validator runtime truth is green through epoch125" "$STATUS"
grep -q "Buy VOID real payment claim has not been run" "$STATUS"
echo "[ok] status file still records launch blockers"

echo
echo "=== [4] blockers doc still keeps money last ==="
grep -q "launch_state: not_go_for_public_mainnet0" "$BLOCKERS"
grep -q "The money step is intentionally last" "$BLOCKERS"
grep -q "Blocker 2: public validator admission is not promoted" "$BLOCKERS"
grep -q "Public participant validator registration remains candidate/waiting only" "$BLOCKERS"
grep -q "Buy VOID real claim/send is not complete" "$BLOCKERS"
echo "[ok] blockers doc still matches intended order"

echo
echo "=== [5] existing validator blocker proof ==="
make mainnet0-validator-admission-blocker-proof

echo
echo "=== [6] summary ==="
python3 - <<'PY'
print({
  "promotion_plan": "documented",
  "mutation_allowed": False,
  "launch_state": "not_go_for_public_mainnet0",
  "public_validator_promotion": "blocked",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 validator admission promotion plan proof passed"
