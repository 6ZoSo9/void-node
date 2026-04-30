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
STATUS_FILE="ops/mainnet/mainnet0-status.current.md"
VALIDATOR_STATUS="ops/mainnet/validator-status.current.yaml"

grep -q "status: not_go_for_public_mainnet0" "$STATUS_FILE"
grep -q "Buy VOID real payment claim has not been run" "$STATUS_FILE"
grep -q "No real Base USDC transaction hash has been verified" "$STATUS_FILE"
grep -q "No VOID has been sent from the Buy VOID claim path" "$STATUS_FILE"
grep -q "Validator is still a plan-only candidate" "$STATUS_FILE"
grep -q "Validator is not active" "$STATUS_FILE"
grep -q "Validator is not live admitted" "$STATUS_FILE"
grep -q "status: plan_only_candidate_declared" "$VALIDATOR_STATUS"
grep -q "not active or live admitted" "$VALIDATOR_STATUS"

echo "[NO-GO] Mainnet-0 public launch is intentionally blocked by current status file."
echo "[NO-GO] Ready/update/lifecycle checks are green, but launch approval is still false."
echo "[NO-GO] Remaining blockers include Buy VOID real claim/send and validator live admission."
exit 2
