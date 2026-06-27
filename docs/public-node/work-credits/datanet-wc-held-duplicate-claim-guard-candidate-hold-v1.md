# DataNet WC Held Duplicate Claim Guard Candidate Hold v1

Marker: `VOID_DATANET_WC_HELD_DUPLICATE_CLAIM_GUARD_CANDIDATE_HOLD_V1`

## What changed

This brick publishes a public candidate shape for a future duplicate-claim guard before any DataNet Work Credits approval or ledger-write path:

- `/public-node/work-credits/datanet-wc-held-duplicate-claim-guard-candidate-hold-v1.json`

It also indexes the candidate from:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits lane now has a candidate duplicate-claim guard shape for future review planning.

This follows the held review decision packet candidate and defines how future approval paths could check duplicate claims if later authorized.

## Boundary

This is duplicate-claim-guard-candidate-only.

The duplicate scan is not active.

No claim fingerprint is created.

No claim is accepted.

No claim is rejected.

No review decision is approved.

The candidate `eligible_for_wc` value is `false`.

The candidate WC amount is `0`.

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

The DataNet Work Credits lane now has a held duplicate-claim guard candidate while all submission, intake, assignment, review decision, approval, earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
