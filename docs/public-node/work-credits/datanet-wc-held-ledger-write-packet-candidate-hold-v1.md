# DataNet WC Held Ledger Write Packet Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_LEDGER_WRITE_PACKET_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits ledger-write packet:

- `/public-node/work-credits/datanet-wc-held-ledger-write-packet-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate ledger-write packet shape for future review planning.

This follows the held approval packet candidate and defines what a future ledger-write packet could look like if later authorized.

## Boundary

This is ledger-write-packet-candidate-only.

The candidate `eligible_for_wc` value is `false`.

The candidate WC amount is `0`.

It does not create a ledger-write packet.

It does not create a Work Credits ledger line.

It does not prepare a ledger append.

It does not perform a ledger append.

It does not mutate a ledger file.

It does not perform WC issuance.

It does not allocate or transfer VOID.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not expose private DataNet object material.

It does not expose participant, reviewer, operator, approver, or ledger-writer identifiers.

It does not access wallets or signers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits lane now has a held ledger-write packet candidate while all submission, intake, assignment, review decision, duplicate-claim guard, approval, ledger, earning, issuance, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
