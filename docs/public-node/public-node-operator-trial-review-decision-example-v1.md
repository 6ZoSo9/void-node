# Public Node Operator Trial Review Decision Example v1

Status: trial review decision example ready.

Marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_REVIEW_DECISION_EXAMPLE_V1`

Expected proof marker: `VOID_PUBLIC_NODE_OPERATOR_TRIAL_REVIEW_DECISION_EXAMPLE_V1_GREEN`

## Purpose

This is a public-safe example operator decision for the Public Node Operator Trial Receipt Example v1.

It classifies the example receipt as `informational` only.

## Boundary

This example decision is read-only and public-safe. It does not enable wallet sends, money movement, Buy VOID fulfillment, WC issuance, WC ledger writes, WC to VOID swap, validator admission, validator mutation, runtime truth claims, or tester receipts as network truth.

## Example decision result

- decision: `informational`
- decision status: `example_not_applied`
- accepted as evidence: `false`
- work credit awarded: `false`
- work credit amount: `0`
- WC ledger write authorized: `false`
- Buy VOID fulfillment authorized: `false`
- validator admission authorized: `false`
- network truth claim: `false`

A real submitted receipt still requires operator review.
