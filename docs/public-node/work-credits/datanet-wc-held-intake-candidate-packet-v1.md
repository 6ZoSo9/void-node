# DataNet WC Held Intake Candidate Packet v1

Marker: `VOID_DATANET_WC_HELD_INTAKE_CANDIDATE_PACKET_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits intake packet:

- `/public-node/work-credits/datanet-wc-held-intake-candidate-packet-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate packet shape for future intake planning.

This moves the lane one step closer to real earning design while keeping intake closed.

## Boundary

This is candidate-only.

It does not open intake.

It does not accept packets.

It does not create a public submission endpoint.

It does not create an intake queue.

It does not create an operator review queue.

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

The DataNet Work Credits lane now has a held intake candidate packet while all submission, intake, review decision, approval, earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
