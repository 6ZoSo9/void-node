# VOID Public Node DataNet Challenge Operator Review Record Fixture v1

Marker: `VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_DOC_V1`

## Route

`GET /public-node/datanet/challenge-operator-review-record-fixture-v1.json`

## Purpose

This fixture models an operator review record for an imported DataNet Challenge tester receipt.

It can mark an imported receipt as accepted for future Work Credit review, but it does not make a final Work Credit decision.

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
- WC delta now: 0
- money movement: false
- wallet send: false
- validator mutation: false

## Expected proof marker

`VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_PROOF_V1_GREEN`
