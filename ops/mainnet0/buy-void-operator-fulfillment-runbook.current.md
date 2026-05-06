# Buy VOID Operator Fulfillment Runbook — Mainnet-0 Current

Status: hard_stop_real_money_controls
Current commit baseline: 33424567
Checkpoint tag: ckpt-buy-void-payment-confirmed-no-void-send-green-20260506-100020

## Purpose

This runbook separates the Buy VOID lifecycle into phases so a verified payment cannot accidentally become a VOID send.

## Phase 1: Create request, queue, and watch target

Allowed:
- Create Buy VOID request from participant flow.
- Queue the request.
- Create a Base native USDC watch target.
- Record request_id, queue_id, watch_id, payment tag, receiver, amount, and delivery wallet.

Not allowed:
- Do not claim a payment.
- Do not record payment_confirmed without proof.
- Do not record void_sent.
- Do not record completed.
- Do not send VOID.

Proofs:
- make buy-void-backend-readiness-proof
- make buy-void-base-claim-rehearsal-note-proof

## Phase 2: Claim verification only

Allowed:
- Run claim verification only when a real Base native USDC tx hash exists.
- Verify chain, receiver, token, amount, confirmations, and matching watch target.
- Record payment_seen or payment_confirmed only if the claim verification passes.

Not allowed:
- Claim verification is not VOID fulfillment.
- Do not send VOID from the claim verification lane.
- Do not record void_sent from the claim verification lane.
- Do not mark completed from the claim verification lane.

Proofs:
- make buy-void-claim-tx-failclosed-proof

## Phase 3: Payment confirmed but no VOID send

Allowed:
- Confirm that a payment_confirmed queue still has empty void_tx_ref.
- Confirm fulfillment still requires explicit void_tx_ref.

Not allowed:
- payment_confirmed does not equal VOID sent.
- Do not auto-send VOID after payment_confirmed.
- Do not record void_sent without explicit operator VOID transaction reference.
- Do not record completed without the fulfillment proof path.

Proofs:
- make buy-void-payment-confirmed-no-void-send-proof
- make buy-void-fulfillment-failclosed-proof

## Phase 4: Future fulfillment recording

Allowed only after a separate fulfillment proof exists and passes:
- Record void_sent with explicit void_tx_ref.
- Record completed only after void_sent is recorded or the completion path explicitly records both transitions.

Not allowed today:
- No real VOID send from this runbook.
- No automatic VOID transfer.
- No production fulfillment without a separate signed/operator-approved fulfillment proof.
- No fulfillment from blind direct deposits.
- No fulfillment from exchange or custodial wallet sends.

## Hard stop rules

If any proof fails, stop.

The money step remains last.

A real Base native USDC transaction hash is required before MODE=claim.

MODE=claim verifies payment only.

MODE=claim must not be treated as permission to send VOID.

A payment_confirmed queue must keep void_tx_ref empty until a separate fulfillment action records a real VOID transaction reference.

No VOID send should occur until a separate fulfillment proof exists and passes.

## Current required safety stack

make buy-void-backend-readiness-proof
make buy-void-claim-tx-failclosed-proof
make buy-void-base-claim-rehearsal-note-proof
make buy-void-fulfillment-failclosed-proof
make buy-void-payment-confirmed-no-void-send-proof
