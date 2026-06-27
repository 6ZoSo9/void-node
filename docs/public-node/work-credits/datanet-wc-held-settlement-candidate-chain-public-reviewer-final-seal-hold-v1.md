# DataNet WC Held Settlement Candidate Chain Public Reviewer Final Seal Hold v1

Marker: `VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_PUBLIC_REVIEWER_FINAL_SEAL_HOLD_V1`

## What changed

This brick publishes a public reviewer final seal for the held DataNet Work Credits settlement candidate chain:

- `/public-node/work-credits/datanet-wc-held-settlement-candidate-chain-public-reviewer-final-seal-hold-v1.json`

It also indexes the seal from:

- `/public-node/work-credits/index.json`

## Work Credits policy

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.

The `0` WC and `0` VOID values in this seal are placeholders only.

They do not declare a Work Credits lifetime supply cap.

## Boundary

This is public-reviewer-final-seal-only.

The settlement candidate chain is closed on hold.

It does not issue WC.

It does not append a ledger line.

It does not allocate or transfer VOID.

It does not create, sign, or broadcast a transaction.

It does not expose a transaction hash.

It does not create or publish a settlement receipt.

It does not create or publish a verify pack.

It does not access a wallet or signer.

It does not enable a runtime route or mutation handler.

Expected proof result:

`VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_PUBLIC_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN`
