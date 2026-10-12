# DataNet WC Held VOID Transfer Packet Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_VOID_TRANSFER_PACKET_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits VOID transfer packet:

- `/public-node/work-credits/datanet-wc-held-void-transfer-packet-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate VOID transfer packet shape for future review planning.

This follows the held VOID allocation packet candidate and defines what a future transfer packet could look like if later authorized.

## Boundary

This is VOID-transfer-packet-candidate-only.

The candidate VOID amount is `0`.

It does not create a transfer packet.

It does not prepare a VOID transfer.

It does not perform a VOID transfer.

It does not create a transaction.

It does not sign a transaction.

It does not broadcast a transaction.

It does not expose a transaction hash.

It does not open an execute gate.

It does not require wallet access.

It does not require signer access.

It does not expose private key material.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not expose private DataNet object material.

It does not expose participant, reviewer, operator, approver, ledger-writer, issuer, allocator, transfer-operator, wallet, or transaction identifiers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits lane now has a held VOID transfer packet candidate while all submission, intake, assignment, review decision, duplicate-claim guard, approval, ledger, issuance, allocation, transfer, broadcast, payment, signer, wallet, runtime, and mutation paths remain held.
