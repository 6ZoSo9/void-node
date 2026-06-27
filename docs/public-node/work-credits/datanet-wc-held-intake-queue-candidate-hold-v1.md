# DataNet WC Held Intake Queue Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_INTAKE_QUEUE_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits intake queue:

- `/public-node/work-credits/datanet-wc-held-intake-queue-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate queue shape for future intake planning.

This follows the held intake candidate packet and defines how future packets could be organized if intake is later authorized.

## Boundary

This is queue-candidate-only.

It does not create a live intake queue.

It does not accept packets.

It does not create a public submission endpoint.

It does not create an operator review queue.

It does not activate an operator review queue.

It does not activate review.

It does not open live earning.

It does not approve WC.

It does not perform WC issuance.

It does not create or append a Work Credits ledger line.

It does not allocate or transfer VOID.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not expose private DataNet object material.

It does not expose participant, reviewer, or operator identifiers.

It does not access wallets or signers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits lane now has a held intake queue candidate while all submission, intake, review decision, approval, earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
