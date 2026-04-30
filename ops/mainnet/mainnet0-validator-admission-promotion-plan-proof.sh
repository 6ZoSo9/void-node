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
echo "[ok] plan is explicitly plan-only and non-mutating"

echo
echo "=== [3] current status still blocks launch ==="
grep -q "status: not_go_for_public_mainnet0" "$STATUS"
grep -q "Validator is still a plan-only candidate" "$STATUS"
grep -q "Validator is not active" "$STATUS"
grep -q "Validator is not live admitted" "$STATUS"
grep -q "Buy VOID real payment claim has not been run" "$STATUS"
echo "[ok] status file still records launch blockers"

echo
echo "=== [4] blockers doc still keeps money last ==="
grep -q "launch_state: not_go_for_public_mainnet0" "$BLOCKERS"
grep -q "The money step is intentionally last" "$BLOCKERS"
grep -q "validator is not active or live admitted" "$BLOCKERS"
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
  "validator_live_admission": "blocked",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 validator admission promotion plan proof passed"
