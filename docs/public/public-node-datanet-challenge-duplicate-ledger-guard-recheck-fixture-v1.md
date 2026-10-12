# VOID Public Node DataNet Challenge Duplicate Ledger Guard Recheck Fixture v1

Marker: `VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_DOC_V1`

## Route

`GET /public-node/datanet/challenge-duplicate-ledger-guard-recheck-fixture-v1.json`

## Purpose

This fixture models a duplicate ledger guard recheck for the DataNet Challenge award record preview.

It checks the previewed award record ID in a fixture-only way and asserts no duplicate ledger entry is found.

It does not make a final Work Credit award decision.

It does not award Work Credits.

It does not create an award record.

It does not create a ledger entry.

It does not write the WC ledger.

## Safety boundary

- duplicate ledger check performed now: true
- duplicate ledger entry found: false
- award record preview state: preview only, not created, not awarded
- selected positive WC delta fixture: true
- proposed WC delta fixture: 100
- WC delta now: 0
- final award decision: false
- award record created now: false
- ledger entry created now: false
- mutation: false
- live runtime write: false
- ledger write: false
- WC credit award: false
- money movement: false
- wallet send: false
- validator mutation: false

## Expected proof marker

`VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_PROOF_V1_GREEN`
