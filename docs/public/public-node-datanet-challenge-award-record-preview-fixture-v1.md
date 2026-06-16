# VOID Public Node DataNet Challenge Award Record Preview Fixture v1

Marker: `VOID_DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_FIXTURE_DOC_V1`

## Route

`GET /public-node/datanet/challenge-award-record-preview-fixture-v1.json`

## Purpose

This fixture previews the award record that could be created later from the DataNet Challenge award intent packet.

It is a preview fixture only.

It does not make a final Work Credit award decision.

It does not award Work Credits.

It does not create an award record.

It does not create a ledger entry.

It does not write the WC ledger.

## Safety boundary

- award record preview present: true
- award record preview state: preview only, not created, not awarded
- selected positive WC delta fixture: true
- proposed WC delta fixture: 100
- WC delta now: 0
- final award decision: false
- award record created now: false
- ledger entry created now: false
- duplicate ledger check performed now: false
- mutation: false
- live runtime write: false
- ledger write: false
- WC credit award: false
- money movement: false
- wallet send: false
- validator mutation: false

## Expected proof marker

`VOID_DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_FIXTURE_PROOF_V1_GREEN`
