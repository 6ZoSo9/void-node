# DataNet WC Review Criteria Hold v1

Marker: `VOID_DATANET_WC_REVIEW_CRITERIA_HOLD_V1`

## What changed

This brick publishes public review criteria for future DataNet Work Credits evaluation:

- `/public-node/work-credits/datanet-wc-review-criteria-hold-v1.json`

It also indexes the criteria from:

- `/public-node/work-credits/index.json`

## Purpose

The Work Credits lane now has:

1. a public index,
2. a DataNet availability status card,
3. an available-work packet template,
4. a public-safe example packet,
5. public review criteria.

The criteria explain how future DataNet availability work packets may be judged without activating review, intake, earning, issuance, ledger mutation, payment handling, or execution.

## Boundary

This is criteria-only.

It does not accept work packets.

It does not create a public submission endpoint.

It does not enable live earning.

It does not perform WC issuance.

It does not approve WC.

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

The DataNet Work Credits lane now has public fairness criteria while all submission, review approval, earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
