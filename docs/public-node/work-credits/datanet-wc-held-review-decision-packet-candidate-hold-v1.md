# DataNet WC Held Review Decision Packet Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_REVIEW_DECISION_PACKET_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits review decision packet:

- `/public-node/work-credits/datanet-wc-held-review-decision-packet-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate review decision packet shape for future review planning.

This follows the held operator review queue candidate and defines what a future review decision packet could look like if later authorized.

## Boundary

This is review-decision-packet-candidate-only.

The candidate decision is `none`.

The candidate `eligible_for_wc` value is `false`.

The candidate WC amount is `0`.

It does not create a decision packet.

It does not sign a decision.

It does not approve a decision.

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

The DataNet Work Credits lane now has a held review decision packet candidate while all submission, intake, assignment, review decision, approval, earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
