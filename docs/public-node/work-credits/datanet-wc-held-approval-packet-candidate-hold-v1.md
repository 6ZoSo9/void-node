# DataNet WC Held Approval Packet Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_APPROVAL_PACKET_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future DataNet Work Credits approval packet:

- `/public-node/work-credits/datanet-wc-held-approval-packet-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate approval packet shape for future review planning.

This follows the held duplicate-claim guard candidate and defines what a future approval packet could look like if later authorized.

## Boundary

This is approval-packet-candidate-only.

The candidate `approved` value is `false`.

The candidate `eligible_for_wc` value is `false`.

The candidate WC amount is `0`.

It does not create an approval packet.

It does not sign approval.

It does not perform approval.

It does not unlock ledger write.

It does not open live earning.

It does not perform WC issuance.

It does not create or append a Work Credits ledger line.

It does not allocate or transfer VOID.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not expose private DataNet object material.

It does not expose participant, reviewer, operator, or approver identifiers.

It does not access wallets or signers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits lane now has a held approval packet candidate while all submission, intake, assignment, review decision, duplicate-claim guard, approval, earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
