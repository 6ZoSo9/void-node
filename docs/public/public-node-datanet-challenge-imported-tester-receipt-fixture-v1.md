# VOID Public Node DataNet Challenge Imported Tester Receipt Fixture v1

Marker: `VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_DOC_V1`

## Route

`GET /public-node/datanet/challenge-imported-tester-receipt-fixture-v1.json`

## Purpose

This fixture shows what an operator-local imported DataNet Challenge tester receipt looks like after a tester returns the receipt template.

It is a fixture only.

It does not import a live public submission.

It does not award Work Credits.

It does not write the WC ledger.

It does not mutate live runtime state.

## Safety boundary

- public read-only: true
- operator-local intake only: true
- public submit route enabled: false
- mutation: false
- live runtime write: false
- ledger write: false
- WC credit award: false
- money movement: false
- wallet send: false
- validator mutation: false

## Expected proof marker

`VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_PROOF_V1_GREEN`
