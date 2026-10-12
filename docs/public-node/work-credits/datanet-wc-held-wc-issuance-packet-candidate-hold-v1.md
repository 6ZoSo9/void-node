# DataNet WC Held WC Issuance Packet Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_WC_ISSUANCE_PACKET_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits issuance packet:

- `/public-node/work-credits/datanet-wc-held-wc-issuance-packet-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate WC issuance packet shape for future review planning.

This follows the held ledger-write packet candidate and defines what a future WC issuance packet could look like if later authorized.

## Boundary

This is WC-issuance-packet-candidate-only.

The candidate `eligible_for_wc` value is `false`.

The candidate WC amount is `0`.

The candidate WC delta is `0`.

It does not create a WC issuance packet.

It does not prepare issuance.

It does not perform WC issuance.

It does not create a Work Credits ledger line.

It does not perform a ledger append.

It does not mutate a ledger file.

It does not unlock VOID allocation.

It does not allocate or transfer VOID.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not expose private DataNet object material.

It does not expose participant, reviewer, operator, approver, ledger-writer, or issuer identifiers.

It does not access wallets or signers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits lane now has a held WC issuance packet candidate while all submission, intake, assignment, review decision, duplicate-claim guard, approval, ledger, issuance, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
