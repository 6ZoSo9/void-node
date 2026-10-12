# Buy VOID Explicit Fulfillment Runbook

status: plan_only
launch_state: public_mainnet0_live
mutation_allowed_by_this_doc: false
operator_label: zoso

## Purpose

This runbook defines the explicit post-payment fulfillment path for Buy VOID.

Payment confirmation must not automatically send VOID.

VOID fulfillment must remain a separate operator step requiring an explicit VOID transaction reference.

## Current supported payment lanes

- Base native USDC
- Ethereum mainnet USDC

## Current proof posture

The old hardcoded Ethereum watch/queue/payment example has been superseded.

Current proof posture:

- Base no-send proof uses a fresh disposable request, queue, and watch.
- Ethereum no-send proof uses a fresh disposable request, queue, and watch.
- Both lanes record manual payment_confirmed observations only.
- Both lanes require void_tx_ref to remain empty before explicit fulfillment.
- Fulfillment without void_tx_ref must fail with missing_void_tx_ref.
- No void_sent or completed transition may occur from payment confirmation alone.

Current proof checkpoint:

- commit: fc954906
- tag: ckpt-buy-void-ethereum-no-send-refresh-green-20260528-135155

## Required safety rules

1. Do not send VOID automatically after USDC payment confirmation.
2. Do not mark VOID as sent without a real VOID transaction reference.
3. Do not use fake VOID transaction references.
4. Do not use a Base proof to claim an Ethereum payment.
5. Do not use an Ethereum proof to claim a Base payment.
6. Fulfillment must be operator-triggered and auditable.
7. Payment confirmation and VOID fulfillment are separate state transitions.
8. If fulfillment fails, payment_confirmed must remain visible for manual recovery.

## Current fulfillment endpoint behavior

The fulfillment endpoint must reject fulfillment without void_tx_ref.

Expected fail-closed behavior:

POST /__void/operator/buy-void/watch-targets/fulfill

Body without void_tx_ref:

{
  "watch_id": "buywatch_1778589099533_22c953e4",
  "fulfill_status": "void_sent"
}

Expected result:

HTTP 400
error: missing_void_tx_ref

## Future real fulfillment command shape

Do not run this until a real VOID send has happened and the real VOID transaction reference is known.

POST /__void/operator/buy-void/watch-targets/fulfill

{
  "watch_id": "buywatch_1778589099533_22c953e4",
  "fulfill_status": "void_sent",
  "void_tx_ref": "REAL_VOID_TX_REF_HERE",
  "operator_note": "manual VOID fulfillment after Ethereum USDC payment confirmation"
}

## Launch implication

This runbook does not clear public Mainnet-0 launch by itself.

The money step remains explicit and last.
