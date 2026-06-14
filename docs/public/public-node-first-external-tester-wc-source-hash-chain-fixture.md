# Public Node First External Tester WC Source Hash Chain Fixture

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_DOC_V1`

This document defines the preview fixture for the first external tester Work Credit source hash chain.

The fixture is intentionally public, read-only, deterministic, and non-mutating.

## Public surface

- JSON route: `/public-node/first-external-tester-wc-source-hash-chain-fixture.json`
- Route marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_ROUTE_V1`
- UI marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_UI_V1`

## Fixture purpose

The fixture previews the chain shape that must exist before a future WC ledger write can be considered.

It does not approve the chain.
It does not promote `source_hash_chain_green`.
It does not flip ledger write readiness.
It does not write the WC ledger.
It does not award WC.
It does not perform WC-to-VOID swap.

## Required preview order

1. tester receipt
2. imported closeout proof
3. operator review record
4. operator decision record
5. operator award intent packet
6. operator award record
7. ledger entry preview
8. future operator ledger write record placeholder

## Boundary

- fixture_only=true
- preview_only=true
- source_hash_chain_green=false
- source_hash_chain_promoted_to_approved=false
- ready_for_ledger_write=false
- wc_ledger_write=false
- wc_credit_award=false
- wc_to_void_swap=false
