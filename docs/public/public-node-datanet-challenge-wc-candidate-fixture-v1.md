# VOID Public Node DataNet Challenge WC Candidate Fixture v1

Marker: `VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_DOC_V1`

## Route

`GET /public-node/datanet/challenge-wc-candidate-fixture-v1.json`

## Purpose

This fixture models a Work Credit candidate for a reviewed DataNet Challenge tester receipt.

It says the reviewed receipt may be eligible for a future Work Credit decision.

It does not make that decision.

It does not award Work Credits.

It does not write the WC ledger.

It does not create an award record.

It does not create a ledger entry.

## Safety boundary

- candidate only: true
- public read-only: true
- operator-local intake only: true
- public submit route enabled: false
- mutation: false
- live runtime write: false
- ledger write: false
- WC credit award: false
- WC delta now: 0
- award record created now: false
- ledger entry created now: false
- money movement: false
- wallet send: false
- validator mutation: false

## Expected proof marker

`VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_PROOF_V1_GREEN`
