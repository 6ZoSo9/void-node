#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

RUNBOOK="ops/mainnet0/buy-void-operator-fulfillment-runbook.current.md"

echo "=== Buy VOID operator fulfillment runbook proof ==="
echo "runbook=$RUNBOOK"

test -f "$RUNBOOK"

needles=(
  "Status: hard_stop_real_money_controls"
  "Current commit baseline: 33424567"
  "ckpt-buy-void-payment-confirmed-no-void-send-green-20260506-100020"
  "Claim verification is not VOID fulfillment."
  "payment_confirmed does not equal VOID sent."
  "Do not auto-send VOID after payment_confirmed."
  "Do not record void_sent without explicit operator VOID transaction reference."
  "No real VOID send from this runbook."
  "No automatic VOID transfer."
  "If any proof fails, stop."
  "The money step remains last."
  "A real Base native USDC transaction hash is required before MODE=claim."
  "MODE=claim verifies payment only."
  "MODE=claim must not be treated as permission to send VOID."
  "No VOID send should occur until a separate fulfillment proof exists and passes."
  "make buy-void-backend-readiness-proof"
  "make buy-void-claim-tx-failclosed-proof"
  "make buy-void-base-claim-rehearsal-note-proof"
  "make buy-void-fulfillment-failclosed-proof"
  "make buy-void-payment-confirmed-no-void-send-proof"
)

for needle in "${needles[@]}"; do
  grep -Fq "$needle" "$RUNBOOK" || {
    echo "[ERR] missing runbook text: $needle"
    exit 1
  }
  echo "[ok] $needle"
done

echo
echo "[ok] Buy VOID operator fulfillment runbook proof passed"
