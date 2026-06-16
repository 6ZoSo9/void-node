# VOID Public Node DataNet Challenge Receipt Intake v1

Marker: `VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_DOC_V1`

## Routes

- `GET /public-node/datanet/challenge-tester-result-receipt-v1.json`
- `GET /public-node/datanet/challenge-receipt-intake-status-v1.json`

## Purpose

This checkpoint creates the first receipt lane for DataNet Challenge v1.

An outside tester can run the DataNet Challenge Offline Verify Pack, collect the green marker, and return a structured receipt to the operator.

This does **not** accept public submissions.

This does **not** award Work Credits.

This does **not** write the WC ledger.

This does **not** mutate live runtime state.

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

## Required tester return marker

`VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_RETURN_V1`

## Proof marker

`VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_PROOF_V1_GREEN`
