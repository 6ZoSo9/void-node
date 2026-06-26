# VOID DataNet WC Availability Reviewer Rollup v1

**Marker:** `VOID_DATANET_WC_AVAILABILITY_REVIEWER_ROLLUP_V1`

**Status:** Reviewer-rollup/proof-only; no WC issuance.

## Purpose

This artifact defines a reviewer rollup for the DataNet WC availability reviewed-work lane.

The rollup summarizes the reviewed-work chain without issuing Work Credits or writing a ledger.

This rollup does not issue Work Credits by itself.

## Covered Chain

- quest lane: `VOID_DATANET_WC_AVAILABILITY_QUEST_LANE_V1`
- evidence packet: `VOID_DATANET_WC_AVAILABILITY_EVIDENCE_PACKET_SCHEMA_V1`
- reviewer decision packet: `VOID_DATANET_WC_AVAILABILITY_REVIEWER_DECISION_PACKET_V1`
- award recommendation hold: `VOID_DATANET_WC_AVAILABILITY_AWARD_RECOMMENDATION_HOLD_V1`
- duplicate guard: `VOID_DATANET_WC_AVAILABILITY_DUPLICATE_GUARD_V1`

## Rollup Result Fields

- participant identifier
- DataNet object id or content root
- reviewer decision
- duplicate guard result
- recommendation status
- rollup status
- reviewer id
- timestamp

## Allowed Rollup Status

- `ready_for_future_wc_ledger_review`
- `blocked_duplicate_confirmed`
- `blocked_missing_reviewer_approval`
- `blocked_missing_recommendation`
- `blocked_inconclusive_duplicate_guard`
- `needs_more_evidence`

## Rollup Boundary

This artifact is a rollup and a reviewer-facing summary only.

It does not:

- issue Work Credits
- write the WC ledger
- allocate VOID
- transfer VOID
- create an automatic reward
- bypass duplicate guard
- bypass later operator or reviewer approval
- bypass later ledger write proof
- mutate claim state
- activate public mutation
- grant signer or wallet access
- authorize execution

## Future Separate Packet Required

A later WC ledger write packet would still be required before any Work Credits exist.

This rollup is only an input to a later decision.
