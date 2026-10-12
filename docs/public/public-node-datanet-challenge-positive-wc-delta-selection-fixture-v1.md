# VOID Public Node DataNet Challenge Positive WC Delta Selection Fixture v1

Marker: `VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_DOC_V1`

## Route

`GET /public-node/datanet/challenge-positive-wc-delta-selection-fixture-v1.json`

## Purpose

This fixture selects a positive nonzero Work Credit delta for a DataNet Challenge WC candidate.

It is a selection fixture only.

It does not make a final Work Credit award decision.

It does not award Work Credits.

It does not create an award record.

It does not create a ledger entry.

It does not write the WC ledger.

## Safety boundary

- selected positive WC delta fixture: true
- proposed WC delta fixture: positive
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

`VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_PROOF_V1_GREEN`
