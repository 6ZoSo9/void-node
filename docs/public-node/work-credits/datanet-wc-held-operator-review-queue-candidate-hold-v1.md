# DataNet WC Held Operator Review Queue Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_OPERATOR_REVIEW_QUEUE_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits operator review queue:

- `/public-node/work-credits/datanet-wc-held-operator-review-queue-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate operator review queue shape for future review planning.

This follows the held intake queue candidate and defines how future packets could be assigned for operator review if later authorized.

## Boundary

This is operator-review-queue-candidate-only.

It does not create a live operator review queue.

It does not accept assignments.

It does not assign packets.

It does not expose operator identity.

It does not expose reviewer identity.

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

The DataNet Work Credits lane now has a held operator review queue candidate while all submission, intake, assignment, review decision, approval, earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
