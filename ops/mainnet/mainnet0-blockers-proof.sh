#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BLOCKERS="ops/mainnet/mainnet0-blockers.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
VALIDATOR="ops/mainnet/validator-status.current.yaml"
INVENTORY="ops/mainnet/mainnet0-validator-candidate-inventory.current.txt"
BUY_VOID_TRUTH_HELPER="scripts/classify_mainnet0_buy_void_truth_v1.py"

echo "=== Mainnet-0 blockers proof ==="

echo
echo "=== [1] required files ==="
test -f "$BLOCKERS"
test -f "$STATUS"
test -f "$VALIDATOR"
test -f "$INVENTORY"
test -f "$BUY_VOID_TRUTH_HELPER"

BUY_VOID_TRUTH="$(
  python3 "$BUY_VOID_TRUTH_HELPER" \
    --blockers "$BLOCKERS" \
    --status "$STATUS"
)"
printf '%s\n' "$BUY_VOID_TRUTH"
BUY_VOID_STATUS="$(
  printf '%s\n' "$BUY_VOID_TRUTH" |
    awk -F= '$1 == "buy_void_status" { print $2 }'
)"
case "$BUY_VOID_STATUS" in
  first_real_fulfillment_complete|first_real_fulfillment_pending) ;;
  *)
    echo "FAIL: invalid Buy VOID truth classification: $BUY_VOID_STATUS" >&2
    exit 1
    ;;
esac

grep -q "launch_state: public_mainnet0_live" "$BLOCKERS"
grep -q "Launch approval prep refs are cross-box proven at 3a626ed5 / ckpt-launch-approval-prep-refs-current-green-20260523-100217." "$BLOCKERS"
grep -q "Launch approval artifact prep is plan-only/not-approved and does not clear launch blockers." "$BLOCKERS"
grep -q "The money step is intentionally last" "$BLOCKERS"
grep -q "Blocker 2: public validator Mainnet-0 posture is candidate-only" "$BLOCKERS"
grep -q "Operator/bootstrap validator runtime truth is green through epoch127" "$BLOCKERS"
grep -q "Durable 8545 restore/recovery lane is green through epoch127" "$BLOCKERS"
grep -q "Blocker 4: final go/no-go remains blocked" "$BLOCKERS"
grep -q "Validator live-admission readiness must be refreshed against the current vault126 / epoch128 selector" "$BLOCKERS"
grep -q "future operator admission remains blocked until a new guarded proof" "$BLOCKERS"
grep -q "Validator next-onboard intent gate proof is green" "$BLOCKERS"
grep -q "Next-onboard intent gate is green, but live admission remains blocked" "$BLOCKERS"
grep -q "Launch approval prep refs are cross-box proven at 3a626ed5 / ckpt-launch-approval-prep-refs-current-green-20260523-100217." "$BLOCKERS"
grep -q "Ready signals are not launch approval" "$BLOCKERS"

grep -q "status: public_mainnet0_live" "$STATUS"
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
python3 - "$BUY_VOID_STATUS" <<'PY'
import sys

buy_void_status = sys.argv[1]
print({
  "launch_state": "public_mainnet0_live",
  "money_step": "ops_seed_complete_future_spend_guarded",
  "validator_blocker": "public_candidate_only_mainnet0_posture",
  "candidate_inventory": "ready_not_admitted",
  "buy_void_status": buy_void_status,
  "go_no_go": "blocked_until_explicitly_cleared",
})
PY

echo
echo "[ok] Mainnet-0 blockers proof passed"
