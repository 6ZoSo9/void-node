# Public Node First External Tester WC Source Hash Chain Design

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_DOC_V1`

This document defines the design-only source hash chain requirements before any first external tester Work Credit ledger write may exist.

## Public surface

- JSON route: `/public-node/first-external-tester-wc-source-hash-chain-design.json`
- Route marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_ROUTE_V1`
- UI marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_UI_V1`

## State

This checkpoint is intentionally design-only.

- `source_hash_chain_green=false`
- `source_hash_chain_promoted_to_approved=false`
- `source_hash_chain_created_now=false`
- `source_hash_chain_verified_now=false`
- `readiness_bit_flipped_now=false`
- `ready_for_ledger_write=false`
- `wc_ledger_write=false`
- `wc_credit_award=false`
- `wc_to_void_swap=false`

## Required chain order

1. external tester receipt
2. imported closeout proof status
3. operator review record
4. operator decision record
5. operator award intent packet
6. operator award record
7. ledger entry preview
8. future operator ledger write record

## Rejection cases

The future checker must reject missing hashes, hash mismatches, broken parent pointers, changed receipt payloads, changed award deltas after preview, duplicate ledger candidates, and missing explicit operator ledger-write confirmation.

## Boundary

This route is public, read-only, and non-mutating. It does not create a source hash chain, does not approve a Work Credit award, and does not write the WC ledger.
