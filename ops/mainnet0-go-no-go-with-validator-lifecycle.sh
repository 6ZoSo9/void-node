#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

RUN_EXISTING="${RUN_MAINNET0_EXISTING_GONO:-0}"

echo "=== Mainnet-0 go/no-go with validator lifecycle ==="
echo "run_existing=$RUN_EXISTING"

if [ "$RUN_EXISTING" = "1" ]; then
  if grep -q '^mainnet0-go-no-go-with-runtime:' Makefile; then
    echo "=== [existing] make mainnet0-go-no-go-with-runtime ==="
    make mainnet0-go-no-go-with-runtime
  elif grep -q '^mainnet0-go-no-go-bundle:' Makefile; then
    echo "=== [existing] make mainnet0-go-no-go-bundle ==="
    make mainnet0-go-no-go-bundle
  else
    echo "[ERR] no existing Mainnet-0 go/no-go target found"
    exit 1
  fi
else
  echo "[skip] existing Mainnet-0 go/no-go bundle not run; set RUN_MAINNET0_EXISTING_GONO=1 to include it"
fi

echo
echo "=== [validator lifecycle] make mainnet0-validator-lifecycle-preflight ==="
make mainnet0-validator-lifecycle-preflight

echo
echo "=== [update safety] make mainnet0-update-safety-proof ==="
make mainnet0-update-safety-proof

echo
echo "=== [status] make mainnet0-status-proof ==="
make mainnet0-status-proof

echo
echo "=== [blockers] make mainnet0-blockers-proof ==="
make mainnet0-blockers-proof

echo
echo "=== [launch blocker] current public Mainnet-0 approval state ==="

# POST_BUYVOID_NOGO_GATE_V1
# Mainnet-0 remains intentionally blocked until explicit launch approval.
# Buy VOID first real fulfillment is closeout-proven now, so the remaining
# launch blocker wording must not rely on the old "Buy VOID real claim/send"
# blocker. This section must fail closed with rc=2, not rc=1.
if grep -q "status: not_go_for_public_mainnet0" "ops/mainnet/mainnet0-status.current.md" \
  && grep -q "launch_state: not_go_for_public_mainnet0" "ops/mainnet/mainnet0-blockers.current.md"; then
  echo "[NO-GO] Mainnet-0 public launch is intentionally blocked by current status file."
  echo "[NO-GO] Ready/update/lifecycle checks are green, but launch approval is still false."
  echo "[NO-GO] Remaining blocker is public validator promotion/final launch approval; first Buy VOID real fulfillment is closeout-proven."
  exit 2
fi

STATUS_FILE="ops/mainnet/mainnet0-status.current.md"
VALIDATOR_STATUS="ops/mainnet/validator-status.current.yaml"

# Fallback fail-closed path for post-Buy-VOID-fulfillment status.
# Do not resurrect the old "real claim/send has not run" blocker after the first fulfillment closeout.
grep -q "status: not_go_for_public_mainnet0" "$STATUS_FILE"
grep -q "Buy VOID has completed its first controlled real-money fulfillment test." "$STATUS_FILE"
grep -q "The completed first fulfillment used Ethereum mainnet USDC and recorded a real VOID fulfillment transaction reference." "$STATUS_FILE"
grep -q "Real Buy VOID payment claim/send has completed once; future fulfillments remain blocked unless payment verification and explicit VOID tx-ref recording pass." "$STATUS_FILE"
grep -q "Public validator candidate promotion/admission remains blocked" "$STATUS_FILE"
grep -q "status: plan_only_candidate_declared" "$VALIDATOR_STATUS"
grep -q "not active or live admitted" "$VALIDATOR_STATUS"

echo "[NO-GO] Mainnet-0 public launch is intentionally blocked by current status file."
echo "[NO-GO] Ready/update/lifecycle checks are green, but launch approval is still false."
echo "[NO-GO] Remaining blocker is public validator promotion/final launch approval; first Buy VOID real fulfillment is closeout-proven."
exit 2
