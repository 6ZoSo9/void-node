# DataNet WC Held VOID Allocation Packet Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_VOID_ALLOCATION_PACKET_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits to VOID allocation packet:

- `/public-node/work-credits/datanet-wc-held-void-allocation-packet-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate VOID allocation packet shape for future review planning.

This follows the held WC issuance packet candidate and defines what a future WC-to-VOID allocation packet could look like if later authorized.

## Boundary

This is VOID-allocation-packet-candidate-only.

The candidate WC amount is `0`.

The candidate VOID amount is `0`.

It does not create an allocation packet.

It does not prepare allocation.

It does not perform VOID allocation.

It does not prepare a VOID transfer.

It does not perform a VOID transfer.

It does not open an execute gate.

It does not require wallet access.

It does not require signer access.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not expose private DataNet object material.

It does not expose participant, reviewer, operator, approver, ledger-writer, issuer, allocator, or wallet identifiers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits lane now has a held VOID allocation packet candidate while all submission, intake, assignment, review decision, duplicate-claim guard, approval, ledger, issuance, allocation, transfer, payment, signer, wallet, runtime, and mutation paths remain held.
