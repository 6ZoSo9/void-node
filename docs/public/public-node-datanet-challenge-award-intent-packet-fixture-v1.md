# VOID Public Node DataNet Challenge Award Intent Packet Fixture v1

Marker: `VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_DOC_V1`

## Route

`GET /public-node/datanet/challenge-award-intent-packet-fixture-v1.json`

## Purpose

This fixture creates a read-only award intent packet for the selected positive Work Credit delta from the DataNet Challenge lane.

It is an intent packet fixture only.

It does not make a final Work Credit award decision.

It does not award Work Credits.

It does not create an award record.

It does not create a ledger entry.

It does not write the WC ledger.

## Safety boundary

- award intent packet present: true
- award intent packet state: intent only, not final, not awarded
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

`VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_PROOF_V1_GREEN`
