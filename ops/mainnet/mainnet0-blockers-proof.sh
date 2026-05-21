#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BLOCKERS="ops/mainnet/mainnet0-blockers.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
VALIDATOR="ops/mainnet/validator-status.current.yaml"
INVENTORY="ops/mainnet/mainnet0-validator-candidate-inventory.current.txt"

echo "=== Mainnet-0 blockers proof ==="

echo
echo "=== [1] required files ==="
test -f "$BLOCKERS"
test -f "$STATUS"
test -f "$VALIDATOR"
test -f "$INVENTORY"

grep -q "launch_state: not_go_for_public_mainnet0" "$BLOCKERS"
grep -q "Final path launch approval ref-clean baseline is cross-box proven at 6984f3bf / ckpt-final-path-launch-approval-ref-clean-green-20260521-003126." "$BLOCKERS"
grep -q "The money step is intentionally last" "$BLOCKERS"
grep -q "Blocker 2: public validator admission is not promoted" "$BLOCKERS"
grep -q "Operator/bootstrap validator runtime truth is green through epoch127" "$BLOCKERS"
grep -q "Durable 8545 restore/recovery lane is green through epoch127" "$BLOCKERS"
grep -Eq "Cleared Blocker: first Buy VOID real claim/send is complete|Cleared Blocker: first Buy VOID real fulfillment closeout is proven|Cleared Blocker: first Buy VOID real fulfillment closeout is complete|Buy VOID real fulfillment has been completed and closeout-proven|Buy VOID has completed its first controlled real-money fulfillment test|Blocker 3: Buy VOID real claim/send is not complete|Buy VOID real claim/send is not complete" "$BLOCKERS"
grep -q "Blocker 4: final go/no-go remains blocked" "$BLOCKERS"
grep -q "Validator live-admission readiness must be refreshed against the current vault126 / epoch128 selector" "$BLOCKERS"
grep -q "future operator admission remains blocked until a new guarded proof" "$BLOCKERS"
grep -q "Validator next-onboard intent gate proof is green" "$BLOCKERS"
grep -q "Next-onboard intent gate is green, but live admission remains blocked" "$BLOCKERS"
grep -q "Final path launch approval ref-clean baseline is cross-box proven at 6984f3bf / ckpt-final-path-launch-approval-ref-clean-green-20260521-003126." "$BLOCKERS"
grep -q "Ready signals are not launch approval" "$BLOCKERS"

grep -q "status: not_go_for_public_mainnet0" "$STATUS"
grep -Eq "First real Buy VOID payment claim and fulfillment have completed successfully|Buy VOID real fulfillment has been completed and closeout-proven|Buy VOID real payment claim has not been run" "$STATUS"
grep -q "Public validator candidate promotion/admission remains blocked" "$STATUS"
grep -q "Operator/bootstrap validator runtime truth is green through epoch127" "$STATUS"

grep -q "status: plan_only_candidate_declared" "$VALIDATOR"
grep -q "not active or live admitted" "$VALIDATOR"

grep -q "status=candidate_inventory_ready_not_admitted" "$INVENTORY"
grep -q "selector_state=ready" "$INVENTORY"
grep -q "command_present=true" "$INVENTORY"
grep -q "live_admission_executed=false" "$INVENTORY"
grep -q "live_admission_allowed=false" "$INVENTORY"
grep -q "money_step=last" "$INVENTORY"

echo "[ok] blocker docs match current not-go status"

echo
echo "=== [2] validator admission blocker proof ==="
make mainnet0-validator-admission-blocker-proof

echo
echo "=== [3] validator admission promotion plan proof ==="
make mainnet0-validator-admission-promotion-plan-proof

echo
echo "=== [4] local no-Prometheus smoke ==="
make mainnet0-status-smoke

echo
echo "=== [5] summary ==="
python3 - <<'PY'
print({
  "launch_state": "not_go_for_public_mainnet0",
  "money_step": "last",
  "validator_blocker": "public_candidate_not_promoted",
  "candidate_inventory": "ready_not_admitted",
  "buy_void_status": "first_real_fulfillment_complete",
  "go_no_go": "blocked_until_explicitly_cleared",
})
PY

echo
echo "[ok] Mainnet-0 blockers proof passed"
