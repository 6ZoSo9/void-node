# Buy VOID Explicit Fulfillment Runbook

status: plan_only
launch_state: not_go_for_public_mainnet0
mutation_allowed_by_this_doc: false
operator_label: zoso

## Purpose

This runbook defines the explicit post-payment fulfillment path for Buy VOID.

Payment confirmation must not automatically send VOID.

VOID fulfillment must remain a separate operator step requiring an explicit VOID transaction reference.

## Current supported payment lanes

- Base native USDC
- Ethereum mainnet USDC

## Current confirmed Ethereum payment

chain: ethereum
asset: ethereum_native_usdc
payment_ref: 0x378fdba93f97afc854b3753011a09b670ab4162759c3cd33c1bc64b236030337
watch_id: buywatch_1778589099533_22c953e4
queue_id: buyq_1778589099373_e86e1740
amount_usdc: 25
receiver: 0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5

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
